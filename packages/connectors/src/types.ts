export type ConnectorKind = "slack" | "discord" | (string & {});

export type ConnectorMessageVisibility = "ephemeral" | "channel" | "dm";

export interface ConnectorIdentity {
  id: string;
  displayName?: string;
}

export interface ConnectorLocation {
  workspaceId?: string;
  channelId: string;
  threadId?: string;
}

export interface NormalizedConnectorCommand {
  connector: ConnectorKind;
  command: string;
  text: string;
  args: string[];
  user: ConnectorIdentity;
  location: ConnectorLocation;
  raw: unknown;
}

export interface ConnectorTextMessage {
  text: string;
  visibility: ConnectorMessageVisibility;
  threadId?: string;
}

export interface ConnectorAdapter<TRawCommand = unknown, TRenderedMessage = unknown> {
  readonly kind: ConnectorKind;
  normalizeCommand(rawCommand: TRawCommand): NormalizedConnectorCommand;
  renderTextMessage(message: ConnectorTextMessage): TRenderedMessage;
}
