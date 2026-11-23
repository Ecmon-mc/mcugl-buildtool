import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Code,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  SimpleGrid,
  Spinner,
  Stack,
  Tabs,
  Text,
} from "@chakra-ui/react";
import ActionCard from "./ActionCard";
import {
  ACTIONS,
  GROUPS,
  type Action,
  type GroupId,
  type SharedKey,
} from "./actions";
import {
  call,
  describeError,
  kernelAvailable,
  manifest as readManifest,
  type ApiErrorBody,
  type KernelManifest,
  type ResourceSnapshot,
} from "./kernel";

interface LogEntry {
  id: string;
  at: string;
  command: string;
  title: string;
  ok: boolean;
  data?: unknown;
  error?: ApiErrorBody;
}

const EMPTY_SHARED: Record<SharedKey, string> = {
  instanceId: "",
  accountId: "",
  serverId: "",
  taskId: "",
  sessionId: "",
  planId: "",
  revision: "",
};

const SHARED_FIELDS: { key: SharedKey; label: string; placeholder: string }[] = [
  { key: "instanceId", label: "instance_id", placeholder: "instance-mcug-1211" },
  { key: "accountId", label: "account_id", placeholder: "account-demo" },
  { key: "serverId", label: "server id", placeholder: "server-id" },
  { key: "taskId", label: "task id", placeholder: "task-id" },
  { key: "sessionId", label: "session_id", placeholder: "session-id" },
  { key: "planId", label: "plan_id", placeholder: "plan-id" },
  { key: "revision", label: "expected_revision", placeholder: "0" },
];

function makeId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stamp(): string {
  return new Date().toLocaleTimeString();
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="sm" fontFamily="mono" truncate>
        {value}
      </Text>
    </Box>
  );
}

export default function App() {
  const [manifest, setManifest] = useState<KernelManifest | null>(null);
  const [manifestError, setManifestError] = useState<ApiErrorBody | null>(null);
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState<Record<SharedKey, string>>(EMPTY_SHARED);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [tab, setTab] = useState<GroupId>("status");

  const syncRevision = useCallback(async () => {
    try {
      const snapshot = await call<ResourceSnapshot>("get_settings");
      if (typeof snapshot.revision === "number") {
        setShared((current) => ({
          ...current,
          revision: String(snapshot.revision),
        }));
      }
    } catch {
      // The revision is a convenience: ignore failures here, the command list
      // below shows the real error when the kernel is unreachable.
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const info = await readManifest();
      setManifest(info);
      setManifestError(null);
    } catch (error) {
      setManifest(null);
      setManifestError(describeError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void syncRevision();
  }, [refresh, syncRevision]);

  const run = useCallback(
    async (action: Action, args: Record<string, unknown>) => {
      setRunning(action.id);
      try {
        const data = await call(action.command, args);
        setLog((entries) =>
          [
            {
              id: makeId(),
              at: stamp(),
              command: action.command,
              title: action.title,
              ok: true,
              data,
            },
            ...entries,
          ].slice(0, 40),
        );
        if (action.command === "get_settings" || action.command === "save_settings") {
          void syncRevision();
        }
      } catch (error) {
        setLog((entries) =>
          [
            {
              id: makeId(),
              at: stamp(),
              command: action.command,
              title: action.title,
              ok: false,
              error: describeError(error),
            },
            ...entries,
          ].slice(0, 40),
        );
      } finally {
        setRunning(null);
      }
    },
    [syncRevision],
  );

  const quick = useCallback(
    (command: string, title: string) => {
      void run({ id: command, command, group: "status", title, fields: [] }, {});
    },
    [run],
  );

  const setSharedValue = useCallback((key: SharedKey, value: string) => {
    setShared((current) => ({ ...current, [key]: value }));
  }, []);

  const covered = useMemo(
    () =>
      new Set([
        ...ACTIONS.filter((action) => !action.host).map((action) => action.command),
        "kernel_manifest",
      ]),
    [],
  );

  const missing = useMemo(
    () => (manifest ? manifest.methods.filter((method) => !covered.has(method)) : []),
    [manifest, covered],
  );

  const connected = kernelAvailable();

  return (
    <Box p={{ base: 4, lg: 6 }} maxW="1400px" mx="auto">
      <Flex justify="space-between" align="start" gap={4} wrap="wrap">
        <Box>
          <Heading size="lg">MCUGL 前端参考实现</Heading>
          <Text fontSize="sm" color="fg.muted" mt={1}>
            覆盖 mcugl.kernel/v1 全部 66 个内核方法，外加 4 个宿主管理命令。所有按钮都直接调用真实内核。
          </Text>
        </Box>
        <HStack gap={2}>
          <Badge colorPalette={connected ? "green" : "red"}>
            {connected ? "已注入内核" : "没有内核"}
          </Badge>
          <Button size="sm" variant="outline" loading={loading} onClick={() => void refresh()}>
            刷新清单
          </Button>
        </HStack>
      </Flex>

      <Box borderWidth="1px" borderRadius="lg" p={4} mt={4} bg="bg.panel">
        {manifestError ? (
          <Stack gap={1}>
            <Text fontSize="sm" fontWeight="semibold" color="red.500">
              无法连接内核（{manifestError.code}）
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {manifestError.message}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              请先构建，然后在启动器里用 MCUGL_FRONTEND 指向 dist/frontend，或把 .mcuglf 导入设置页。
            </Text>
          </Stack>
        ) : manifest ? (
          <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4, 1fr)" }} gap={3}>
            <Info label="protocol" value={manifest.protocol} />
            <Info label="apiVersion" value={manifest.apiVersion} />
            <Info label="appVersion" value={manifest.appVersion} />
            <Info label="backend" value={manifest.backend} />
            <Info label="transports" value={manifest.transports.join(", ") || "-"} />
            <Info label="frontend" value={manifest.frontend?.mode ?? "official"} />
            <Info
              label="方法覆盖"
              value={`${manifest.methods.length - missing.length}/${manifest.methods.length}`}
            />
            <Info label="limits.planTtlSeconds" value={String(manifest.limits.planTtlSeconds)} />
            {missing.length > 0 ? (
              <Box gridColumn="1 / -1">
                <Text fontSize="xs" color="red.500">
                  缺少方法：{missing.join(", ")}
                </Text>
              </Box>
            ) : null}
          </Grid>
        ) : (
          <HStack>
            <Spinner size="sm" />
            <Text fontSize="sm" color="fg.muted">
              正在读取内核清单…
            </Text>
          </HStack>
        )}
      </Box>

      <Box borderWidth="1px" borderRadius="lg" p={4} mt={4} bg="bg.subtle">
        <Text fontSize="xs" fontWeight="semibold" mb={2}>
          共享参数：所有命令的 ID 都从这里取，改一次就够
        </Text>
        <SimpleGrid columns={{ base: 2, md: 3, xl: 7 }} gap={2}>
          {SHARED_FIELDS.map((field) => (
            <Box key={field.key}>
              <Text fontSize="xs" color="fg.muted" mb={1}>
                {field.label}
              </Text>
              <Input
                size="sm"
                fontFamily="mono"
                fontSize="xs"
                placeholder={field.placeholder}
                value={shared[field.key]}
                onChange={(event) => setSharedValue(field.key, event.target.value)}
              />
            </Box>
          ))}
        </SimpleGrid>
        <HStack gap={2} mt={3} wrap="wrap">
          <Button size="xs" variant="outline" onClick={() => quick("list_instances", "列出实例")}>
            读取实例
          </Button>
          <Button size="xs" variant="outline" onClick={() => quick("list_accounts", "列出账号")}>
            读取账号
          </Button>
          <Button size="xs" variant="outline" onClick={() => quick("list_servers", "列出服务器")}>
            读取服务器
          </Button>
          <Button size="xs" variant="outline" onClick={() => quick("list_tasks", "列出任务")}>
            读取任务
          </Button>
          <Button size="xs" variant="outline" onClick={() => quick("list_game_sessions", "列出进程")}>
            读取进程
          </Button>
          <Button size="xs" variant="outline" onClick={() => quick("get_settings", "读取设置")}>
            读取 revision
          </Button>
        </HStack>
      </Box>

      <Grid
        templateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 420px" }}
        gap={4}
        mt={4}
        alignItems="start"
      >
        <Tabs.Root
          value={tab}
          onValueChange={(details) => setTab((details.value as GroupId | null) ?? "status")}
        >
          <Tabs.List overflowX="auto" borderBottomWidth="1px">
            {GROUPS.map((group) => (
              <Tabs.Trigger key={group.id} value={group.id}>
                {group.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {GROUPS.map((group) => (
            <Tabs.Content key={group.id} value={group.id} pt={4}>
              <Text fontSize="xs" color="fg.muted" mb={3}>
                {group.hint}
              </Text>
              <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
                {ACTIONS.filter((action) => action.group === group.id).map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    shared={shared}
                    setShared={setSharedValue}
                    running={running === action.id}
                    onRun={run}
                  />
                ))}
              </SimpleGrid>
            </Tabs.Content>
          ))}
        </Tabs.Root>

        <Box position={{ xl: "sticky" }} top={4}>
          <Box borderWidth="1px" borderRadius="lg" p={4} bg="bg.panel">
            <HStack justify="space-between">
              <Text fontWeight="semibold" fontSize="sm">
                结果
              </Text>
              <Button size="xs" variant="ghost" onClick={() => setLog([])}>
                清空
              </Button>
            </HStack>
            {log.length === 0 ? (
              <Text fontSize="xs" color="fg.muted" mt={2}>
                执行任意命令后，原始结果会出现在这里，方便对照契约。
              </Text>
            ) : null}
            <Stack gap={3} mt={3} maxH="72vh" overflowY="auto">
              {log.map((entry) => (
                <Box key={entry.id} borderTopWidth="1px" pt={2}>
                  <HStack justify="space-between" gap={2}>
                    <Badge colorPalette={entry.ok ? "green" : "red"} size="sm">
                      {entry.ok ? "OK" : "ERR"}
                    </Badge>
                    <Text fontSize="xs" color="fg.muted" fontFamily="mono" truncate>
                      {entry.command}
                    </Text>
                  </HStack>
                  <Text fontSize="xs" color="fg.muted">
                    {entry.at} · {entry.title}
                  </Text>
                  <Code
                    display="block"
                    whiteSpace="pre-wrap"
                    mt={1}
                    p={2}
                    borderRadius="md"
                    fontSize="xs"
                    maxH="240px"
                    overflowY="auto"
                  >
                    {JSON.stringify(entry.ok ? entry.data : entry.error, null, 2)}
                  </Code>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Grid>

      <Text fontSize="xs" color="fg.muted" mt={6}>
        演示后端里 28 个写操作仍返回 UNSUPPORTED，这是后端能力边界，不是前端错误。
      </Text>
    </Box>
  );
}
