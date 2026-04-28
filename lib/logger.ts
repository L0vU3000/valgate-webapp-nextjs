type Meta = Record<string, unknown>;
const fmt = (msg: string, meta?: Meta) => (meta ? `${msg} ${JSON.stringify(meta)}` : msg);

type Logger = {
  info: (msg: string, meta?: Meta) => void;
  warn: (msg: string, meta?: Meta) => void;
  error: (msg: string, meta?: Meta) => void;
  debug: (msg: string, meta?: Meta) => void;
  child: (bindings: Meta) => Logger;
};

function makeLogger(bindings: Meta = {}): Logger {
  const prefix = Object.keys(bindings).length ? JSON.stringify(bindings) + " " : "";
  return {
    info: (msg, meta) => console.info(prefix + fmt(msg, meta)),
    warn: (msg, meta) => console.warn(prefix + fmt(msg, meta)),
    error: (msg, meta) => console.error(prefix + fmt(msg, meta)),
    debug: (msg, meta) => console.debug(prefix + fmt(msg, meta)),
    child: (extra) => makeLogger({ ...bindings, ...extra }),
  };
}

export const logger = makeLogger();
