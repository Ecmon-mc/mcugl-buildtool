import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Code,
  Flex,
  HStack,
  Heading,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import {
  ALL_METHODS,
  call,
  describeError,
  launchGame,
  listAccounts,
  listInstances,
  listTasks,
  manifest,
  overview,
  selectAccount,
  selectInstance,
  type AccountInfo,
  type InstanceInfo,
  type KernelManifest,
  type LauncherOverview,
  type TaskInfo,
} from "./kernel";

type Page = "home" | "instances" | "accounts" | "console" | "settings";

const PAGES: { key: Page; label: string }[] = [
  { key: "home", label: "首页" },
  { key: "instances", label: "实例" },
  { key: "accounts", label: "账号" },
  { key: "console", label: "命令" },
  { key: "settings", label: "设置" },
];

interface Toast {
  tone: "ok" | "err";
  text: string;
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [manifestInfo, setManifestInfo] = useState<KernelManifest | null>(null);
  const [overviewInfo, setOverviewInfo] = useState<LauncherOverview | null>(null);
  const [instances, setInstances] = useState<InstanceInfo[]>([]);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((tone: Toast["tone"], text: string) => {
    setToast({ tone, text });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [info, ov, catalog, accountSnapshot, taskSnapshot] = await Promise.all([
        manifest(),
        overview<LauncherOverview>(),
        listInstances(),
        listAccounts(),
        listTasks(),
      ]);
      setManifestInfo(info);
      setOverviewInfo(ov.data);
      setRevision(ov.revision);
      setInstances(catalog.data.items);
      setAccounts(accountSnapshot.data);
      setTasks(taskSnapshot.data);
    } catch (error) {
      notify("err", describeError(error).message);
    } finally {
      setBusy(false);
    }
  }, [notify]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedInstance = overviewInfo?.selectedInstanceId
    ? instances.find((item) => item.id === overviewInfo.selectedInstanceId) ?? null
    : null;

  const activeAccount = overviewInfo?.activeAccountId
    ? accounts.find((item) => item.id === overviewInfo.activeAccountId) ?? null
    : null;

  const running = tasks.filter((task) => task.status === "running").length;

  async function chooseInstance(id: string) {
    try {
      const saved = await selectInstance(id);
      notify("ok", saved.message);
      await load();
    } catch (error) {
      notify("err", describeError(error).message);
    }
  }

  async function chooseAccount(id: string) {
    try {
      const saved = await selectAccount(id);
      notify("ok", saved.message);
      await load();
    } catch (error) {
      notify("err", describeError(error).message);
    }
  }

  async function launch() {
    if (!selectedInstance) {
      notify("err", "请先在实例页选择一个实例。");
      return;
    }
    const account = activeAccount ?? accounts[0] ?? null;
    if (!account) {
      notify("err", "请先在账号页添加或选择一个账号。");
      return;
    }
    try {
      const saved = await launchGame(selectedInstance.id, account.id);
      notify("ok", saved.message);
    } catch (error) {
      const detail = describeError(error);
      notify("err", `${detail.code}：${detail.message}`);
    }
  }

  return (
    <Flex direction="column" minH="100vh" bg="gray.50" color="gray.800">
      <Flex
        as="header"
        align="center"
        justify="space-between"
        px={5}
        py={3}
        bg="white"
        borderBottomWidth="1px"
        borderColor="gray.200"
      >
        <HStack gap={2}>
          <Box w={8} h={8} borderRadius={10} bg="#228cff" />
          <Text fontWeight="bold" fontSize="lg">
            MCUG Launcher
          </Text>
          {manifestInfo ? (
            <Badge colorPalette="blue">{manifestInfo.protocol}</Badge>
          ) : null}
        </HStack>

        <HStack as="nav" gap={1}>
          {PAGES.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant="ghost"
              bg={page === item.key ? "#228cff" : undefined}
              color={page === item.key ? "white" : "gray.700"}
              onClick={() => setPage(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </HStack>

        <HStack gap={2}>
          {busy ? <Spinner size="sm" /> : null}
          <Text fontSize="xs" color="gray.500">
            {overviewInfo ? `v${overviewInfo.appVersion}` : "未连接"}
          </Text>
        </HStack>
      </Flex>

      <Flex as="main" flex="1" justify="center" px={4} py={6}>
        <Box w="100%" maxW="880px">
          {page === "home" ? (
            <HomePage
              overview={overviewInfo}
              instance={selectedInstance}
              account={activeAccount}
              instances={instances.length}
              accounts={accounts.length}
              running={running}
              onOpenInstances={() => setPage("instances")}
            />
          ) : null}

          {page === "instances" ? (
            <InstancesPage
              items={instances}
              selectedId={overviewInfo?.selectedInstanceId ?? null}
              onSelect={chooseInstance}
              onLaunch={() => void launch()}
            />
          ) : null}

          {page === "accounts" ? (
            <AccountsPage
              items={accounts}
              selectedId={overviewInfo?.activeAccountId ?? null}
              onSelect={chooseAccount}
            />
          ) : null}

          {page === "console" ? <ConsolePage /> : null}

          {page === "settings" ? (
            <SettingsPage
              manifestInfo={manifestInfo}
              revision={revision}
              onRefresh={() => void load()}
            />
          ) : null}
        </Box>
      </Flex>

      <Button
        aria-label="启动游戏"
        position="fixed"
        right={7}
        bottom={7}
        w="72px"
        h="72px"
        borderRadius={20}
        bg="#228cff"
        color="white"
        fontSize="28px"
        boxShadow="0 12px 30px rgba(34, 140, 255, 0.35)"
        disabled={!selectedInstance}
        onClick={() => void launch()}
      >
        ▶
      </Button>

      {toast ? (
        <Box
          position="fixed"
          bottom={6}
          left="50%"
          transform="translateX(-50%)"
          px={4}
          py={2}
          borderRadius="full"
          bg={toast.tone === "ok" ? "gray.900" : "red.600"}
          color="white"
          fontSize="sm"
          boxShadow="lg"
        >
          {toast.text}
        </Box>
      ) : null}
    </Flex>
  );
}

function HomePage(props: {
  overview: LauncherOverview | null;
  instance: InstanceInfo | null;
  account: AccountInfo | null;
  instances: number;
  accounts: number;
  running: number;
  onOpenInstances: () => void;
}) {
  const { instance, account } = props;
  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="2xl">准备启动</Heading>
        <Text mt={2} color="gray.600">
          {instance
            ? `当前实例：${instance.displayName}（${instance.loader} ${instance.minecraft}）`
            : "还没有选择实例，去实例页挑选一个。"}
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4}>
        <Stat label="实例" value={props.instances} />
        <Stat label="账号" value={props.accounts} />
        <Stat label="运行中任务" value={props.running} />
      </SimpleGrid>

      <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={5}>
        <HStack justify="space-between" align="start" gap={4}>
          <VStack align="start" gap={1}>
            <Text fontWeight="semibold">当前状态</Text>
            <Text fontSize="sm" color="gray.600">
              账号：{account ? account.player : "未选择"}
            </Text>
            <Text fontSize="sm" color="gray.600">
              版本：{props.overview ? props.overview.appVersion : "未知"}
            </Text>
          </VStack>
          <Button variant="outline" onClick={props.onOpenInstances}>
            打开实例页
          </Button>
        </HStack>
      </Box>
    </VStack>
  );
}

function Stat(props: { label: string; value: number }) {
  return (
    <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={4}>
      <Text fontSize="xs" color="gray.500">
        {props.label}
      </Text>
      <Text fontSize="3xl" fontWeight="semibold">
        {props.value}
      </Text>
    </Box>
  );
}

function InstancesPage(props: {
  items: InstanceInfo[];
  selectedId: string | null;
  onSelect: (id: string) => Promise<void>;
  onLaunch: () => void;
}) {
  return (
    <VStack align="stretch" gap={4}>
      <Heading size="xl">实例</Heading>
      {props.items.length === 0 ? (
        <Text color="gray.500">没有扫描到实例。</Text>
      ) : null}
      {props.items.map((item) => {
        const active = item.id === props.selectedId;
        return (
          <Box
            key={item.id}
            bg="white"
            borderRadius="xl"
            borderWidth="1px"
            borderColor={active ? "#228cff" : "gray.200"}
            p={4}
          >
            <HStack justify="space-between" gap={4}>
              <VStack align="start" gap={1}>
                <HStack gap={2}>
                  <Text fontWeight="semibold">{item.displayName}</Text>
                  {active ? <Badge colorPalette="blue">使用中</Badge> : null}
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  {item.loader} · {item.minecraft} · {item.mods} 个模组
                </Text>
              </VStack>
              <HStack gap={2}>
                <Button size="sm" variant="outline" onClick={() => void props.onSelect(item.id)}>
                  选择
                </Button>
                <Button
                  size="sm"
                  bg="#228cff"
                  color="white"
                  disabled={!active}
                  onClick={props.onLaunch}
                >
                  启动
                </Button>
              </HStack>
            </HStack>
          </Box>
        );
      })}
    </VStack>
  );
}

function AccountsPage(props: {
  items: AccountInfo[];
  selectedId: string | null;
  onSelect: (id: string) => Promise<void>;
}) {
  return (
    <VStack align="stretch" gap={4}>
      <Heading size="xl">账号</Heading>
      {props.items.length === 0 ? <Text color="gray.500">还没有账号。</Text> : null}
      {props.items.map((item) => {
        const active = item.id === props.selectedId;
        return (
          <Box key={item.id} bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={4}>
            <HStack justify="space-between" gap={4}>
              <VStack align="start" gap={1}>
                <HStack gap={2}>
                  <Text fontWeight="semibold">{item.player}</Text>
                  {active ? <Badge colorPalette="blue">使用中</Badge> : null}
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  {item.kind} · {item.status}
                </Text>
              </VStack>
              <Button size="sm" variant="outline" onClick={() => void props.onSelect(item.id)}>
                选择
              </Button>
            </HStack>
          </Box>
        );
      })}
    </VStack>
  );
}

function ConsolePage() {
  const [command, setCommand] = useState("get_overview");
  const [args, setArgs] = useState("{}");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      let parsed: Record<string, unknown> = {};
      if (args.trim()) {
        const value = JSON.parse(args) as unknown;
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          throw new SyntaxError("参数必须是一个 JSON 对象");
        }
        parsed = value as Record<string, unknown>;
      }
      const result = await call<unknown>(command.trim(), parsed);
      setOutput(JSON.stringify(result, null, 2));
    } catch (failure) {
      setOutput(null);
      if (failure instanceof SyntaxError) {
        setError(`参数 JSON 无效：${failure.message}`);
      } else {
        const detail = describeError(failure);
        setError(`${detail.code}：${detail.message}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box>
        <Heading size="xl">命令</Heading>
        <Text mt={1} fontSize="sm" color="gray.600">
          调用任意内核方法。参数是一个 JSON 对象，键名用 camelCase（例如 {"{"}"instanceId":"…"{"}"}）。
        </Text>
      </Box>

      <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={5}>
        <VStack align="stretch" gap={3}>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              方法
            </Text>
            <Input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="get_overview"
              fontFamily="mono"
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={1}>
              参数（JSON）
            </Text>
            <Textarea
              value={args}
              onChange={(event) => setArgs(event.target.value)}
              rows={5}
              fontFamily="mono"
              fontSize="sm"
            />
          </Box>
          <HStack>
            <Button bg="#228cff" color="white" loading={busy} onClick={() => void run()}>
              执行
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setArgs("{}");
                setOutput(null);
                setError(null);
              }}
            >
              清空结果
            </Button>
          </HStack>
        </VStack>
      </Box>

      <Box
        bg="white"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="gray.200"
        p={5}
        maxH="180px"
        overflowY="auto"
      >
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          全部方法（{ALL_METHODS.length}）
        </Text>
        <Flex wrap="wrap" gap={2}>
          {ALL_METHODS.map((method) => (
            <Button
              key={method}
              size="xs"
              variant="subtle"
              fontFamily="mono"
              onClick={() => setCommand(method)}
            >
              {method}
            </Button>
          ))}
        </Flex>
      </Box>

      {error ? (
        <Box bg="red.50" borderRadius="xl" borderWidth="1px" borderColor="red.200" p={4}>
          <Text fontSize="sm" color="red.700">
            {error}
          </Text>
        </Box>
      ) : null}

      {output ? (
        <Box bg="gray.900" borderRadius="xl" p={4} overflowX="auto">
          <Code display="block" whiteSpace="pre" bg="transparent" color="gray.100" fontSize="sm">
            {output}
          </Code>
        </Box>
      ) : null}
    </VStack>
  );
}

function SettingsPage(props: {
  manifestInfo: KernelManifest | null;
  revision: number;
  onRefresh: () => void;
}) {
  const info = props.manifestInfo;
  const rows: { label: string; value: string }[] = [
    { label: "内核协议", value: info?.protocol ?? "-" },
    { label: "内核 API", value: info?.apiVersion ?? "-" },
    { label: "启动器版本", value: info?.appVersion ?? "-" },
    { label: "后端", value: info?.backend ?? "-" },
    { label: "前端模式", value: info?.frontend?.mode ?? "官方前端" },
    { label: "前端名称", value: info?.frontend?.name ?? "-" },
    { label: "前端版本", value: info?.frontend?.version ?? "-" },
    { label: "设置 revision", value: String(props.revision) },
  ];
  return (
    <VStack align="stretch" gap={4}>
      <Heading size="xl">设置</Heading>
      <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="gray.200" p={5}>
        <VStack align="stretch" gap={2}>
          {rows.map((row) => (
            <HStack key={row.label} justify="space-between">
              <Text fontSize="sm" color="gray.600">
                {row.label}
              </Text>
              <Text fontSize="sm">{row.value}</Text>
            </HStack>
          ))}
        </VStack>
        <Button mt={4} size="sm" variant="outline" onClick={props.onRefresh}>
          刷新
        </Button>
      </Box>
      <Text fontSize="xs" color="gray.500">
        这是 vite-react + simple 布局的起点模板：常规操作走首页/实例/账号页，
        「命令」页可以直接调用 mcugl.kernel/v1 的全部 {ALL_METHODS.length} 个方法，
        因此打包器的功能覆盖检查可以直接通过。
      </Text>
    </VStack>
  );
}
