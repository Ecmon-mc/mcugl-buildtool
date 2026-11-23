import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Field,
  HStack,
  Input,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@chakra-ui/react";
import type { Action, ActionField, SharedKey } from "./actions";

interface ActionCardProps {
  action: Action;
  shared: Record<SharedKey, string>;
  setShared: (key: SharedKey, value: string) => void;
  running: boolean;
  onRun: (action: Action, args: Record<string, unknown>) => void;
}

function parseField(field: ActionField, raw: string): unknown {
  if (field.kind === "number") {
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${field.label} 需要数字`);
    return value;
  }
  if (field.kind === "json") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`${field.label} 不是合法 JSON`);
    }
  }
  return raw;
}

export default function ActionCard({
  action,
  shared,
  setShared,
  running,
  onRun,
}: ActionCardProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const valueOf = (field: ActionField): string =>
    field.bind ? shared[field.bind] : (values[field.key] ?? "");

  const setValue = (field: ActionField, value: string) => {
    if (field.bind) setShared(field.bind, value);
    else setValues((current) => ({ ...current, [field.key]: value }));
  };

  const submit = () => {
    setError(null);
    try {
      const args: Record<string, unknown> = {};
      for (const field of action.fields) {
        const raw = valueOf(field).trim();
        if (field.kind === "boolean") {
          args[field.key] = raw === "true";
          continue;
        }
        if (raw === "") continue;
        args[field.key] = parseField(field, raw);
      }
      onRun(action, args);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="bg.panel">
      <HStack justify="space-between" align="start" gap={2}>
        <Box minW={0}>
          <Text fontWeight="semibold" fontSize="sm">
            {action.title}
          </Text>
          <Text fontSize="xs" color="fg.muted" fontFamily="mono" truncate>
            {action.command}
          </Text>
        </Box>
        {action.host ? (
          <Badge colorPalette="orange" size="sm">
            host
          </Badge>
        ) : null}
      </HStack>

      {action.note ? (
        <Text fontSize="xs" color="fg.muted" mt={2}>
          {action.note}
        </Text>
      ) : null}

      <Stack gap={2} mt={3}>
        {action.fields.map((field) => (
          <Field.Root key={field.key}>
            <Field.Label fontSize="xs">{field.label}</Field.Label>
            {field.kind === "boolean" ? (
              <Switch.Root
                size="sm"
                checked={valueOf(field) === "true"}
                onCheckedChange={(details) =>
                  setValue(field, details.checked ? "true" : "false")
                }
              >
                <Switch.HiddenInput />
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            ) : field.kind === "json" ? (
              <Textarea
                size="sm"
                rows={3}
                fontFamily="mono"
                fontSize="xs"
                placeholder={field.placeholder}
                value={valueOf(field)}
                onChange={(event) => setValue(field, event.target.value)}
              />
            ) : (
              <Input
                size="sm"
                fontFamily="mono"
                fontSize="xs"
                type={field.kind === "number" ? "number" : "text"}
                placeholder={field.placeholder}
                value={valueOf(field)}
                onChange={(event) => setValue(field, event.target.value)}
              />
            )}
            {field.hint ? (
              <Field.HelperText fontSize="xs">{field.hint}</Field.HelperText>
            ) : null}
          </Field.Root>
        ))}
      </Stack>

      {error ? (
        <Text fontSize="xs" color="red.500" mt={2}>
          {error}
        </Text>
      ) : null}

      <Button
        size="sm"
        mt={3}
        colorPalette="blue"
        loading={running}
        onClick={submit}
      >
        执行
      </Button>
    </Box>
  );
}
