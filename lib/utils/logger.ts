const fmt = (msg: string, meta?: unknown) =>
  meta !== undefined ? `${msg} ${JSON.stringify(meta)}` : msg;

export const Logger = {
  info: (msg: string, meta?: unknown) => console.info(fmt(msg, meta)),
  warn: (msg: string, meta?: unknown) => console.warn(fmt(msg, meta)),
  error: (msg: string, meta?: unknown) => console.error(fmt(msg, meta)),
  debug: (msg: string, meta?: unknown) => console.debug(fmt(msg, meta)),
};
