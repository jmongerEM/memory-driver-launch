globalThis.__nitro_main__ = import.meta.url;
import { s as stringifyQuery } from "./_libs/ufo.mjs";
import { d as defineLazyEventHandler, H as H3Core, a as HTTPError, t as toRequest } from "./_libs/h3.mjs";
import { a as NodeResponse } from "./_libs/srvx.mjs";
import "./_libs/rou3.mjs";
import "node:stream";
function lazyService(loader) {
  let promise, mod;
  return {
    fetch(req) {
      if (mod) {
        return mod.fetch(req);
      }
      if (!promise) {
        promise = loader().then((_mod) => mod = _mod.default || _mod);
      }
      return promise.then((mod2) => mod2.fetch(req));
    }
  };
}
const services = {
  ["ssr"]: lazyService(() => import("./_ssr/index.mjs"))
};
globalThis.__nitro_vite_envs__ = services;
const errorHandler$1 = (error, event) => {
  const res = defaultHandler(error, event);
  return new NodeResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled;
  const status = error.status || 500;
  const url = event.url || new URL(event.req.url);
  if (status === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.req.method}] ${url}
`, error);
  }
  const headers2 = {
    "content-type": "application/json",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  if (status === 404 || !event.res.headers.has("cache-control")) {
    headers2["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    status,
    statusText: error.statusText,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status,
    statusText: error.statusText,
    headers: headers2,
    body
  };
}
const errorHandlers = [errorHandler$1];
async function errorHandler(error, event) {
  for (const handler2 of errorHandlers) {
    try {
      const response = await handler2(error, event, { defaultHandler });
      if (response) {
        return response;
      }
    } catch (error2) {
      console.error(error2);
    }
  }
}
const headers = ((m) => function headersRouteRule(event) {
  for (const [key, value] of Object.entries(m.options || {})) {
    event.res.headers.set(key, value);
  }
});
const findRouteRules = /* @__PURE__ */ (() => {
  const $0 = [{ name: "headers", route: "/assets/**", handler: headers, options: { "cache-control": "public, max-age=31536000, immutable" } }];
  return (m, p) => {
    let r = [];
    if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
    let s = p.split("/");
    s.length - 1;
    if (s[1] === "assets") {
      r.unshift({ data: $0, params: { "_": s.slice(2).join("/") } });
    }
    return r;
  };
})();
const _lazy_9ZcT3s = defineLazyEventHandler(() => Promise.resolve().then(function() {
  return ssrRenderer$1;
}));
const findRoute = /* @__PURE__ */ (() => {
  const data = { route: "/**", handler: _lazy_9ZcT3s };
  return ((_m, p) => {
    return { data, params: { "_": p.slice(1) } };
  });
})();
const APP_ID = "default";
function useNitroApp() {
  let instance = useNitroApp._instance;
  if (instance) {
    return instance;
  }
  instance = useNitroApp._instance = createNitroApp();
  globalThis.__nitro__ = globalThis.__nitro__ || {};
  globalThis.__nitro__[APP_ID] = instance;
  return instance;
}
function createNitroApp() {
  const hooks = void 0;
  const captureError = (error, errorCtx) => {
    if (errorCtx?.event) {
      const errors = errorCtx.event.req.context?.nitro?.errors;
      if (errors) {
        errors.push({
          error,
          context: errorCtx
        });
      }
    }
  };
  const h3App = createH3App({ onError(error, event) {
    return errorHandler(error, event);
  } });
  let appHandler = (req) => {
    req.context ||= {};
    req.context.nitro = req.context.nitro || { errors: [] };
    return h3App.fetch(req);
  };
  const app = {
    fetch: appHandler,
    h3: h3App,
    hooks,
    captureError
  };
  return app;
}
function createH3App(config) {
  const h3App = new H3Core(config);
  h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
  {
    h3App["~getMiddleware"] = (event, route) => {
      const pathname = event.url.pathname;
      const method = event.req.method;
      const middleware = [];
      {
        const routeRules = getRouteRules(method, pathname);
        event.context.routeRules = routeRules?.routeRules;
        if (routeRules?.routeRuleMiddleware.length) {
          middleware.push(...routeRules.routeRuleMiddleware);
        }
      }
      if (route?.data?.middleware?.length) {
        middleware.push(...route.data.middleware);
      }
      return middleware;
    };
  }
  return h3App;
}
function getRouteRules(method, pathname) {
  const m = findRouteRules(method, pathname);
  if (!m?.length) {
    return { routeRuleMiddleware: [] };
  }
  const routeRules = {};
  for (const layer of m) {
    for (const rule of layer.data) {
      const currentRule = routeRules[rule.name];
      if (currentRule) {
        if (rule.options === false) {
          delete routeRules[rule.name];
          continue;
        }
        if (typeof currentRule.options === "object" && typeof rule.options === "object") {
          currentRule.options = {
            ...currentRule.options,
            ...rule.options
          };
        } else {
          currentRule.options = rule.options;
        }
        currentRule.route = rule.route;
        currentRule.params = {
          ...currentRule.params,
          ...layer.params
        };
      } else if (rule.options !== false) {
        routeRules[rule.name] = {
          ...rule,
          params: layer.params
        };
      }
    }
  }
  const middleware = [];
  for (const rule of Object.values(routeRules)) {
    if (rule.options === false || !rule.handler) {
      continue;
    }
    middleware.push(rule.handler(rule));
  }
  return {
    routeRules,
    routeRuleMiddleware: middleware
  };
}
function awsRequest(event, context) {
  const method = awsEventMethod(event);
  const url = awsEventURL(event);
  const headers2 = awsEventHeaders(event);
  const body = awsEventBody(event);
  const req = new Request(url, {
    method,
    headers: headers2,
    body
  });
  req.runtime ??= { name: "aws-lambda" };
  req.runtime.aws ??= {
    event,
    context
  };
  return new Request(url, {
    method,
    headers: headers2,
    body
  });
}
function awsEventMethod(event) {
  return event.httpMethod || event.requestContext?.http?.method || "GET";
}
function awsEventURL(event) {
  const hostname = event.headers.host || event.headers.Host || event.requestContext?.domainName || ".";
  const path = event.path || event.rawPath;
  const query = awsEventQuery(event);
  const protocol = (event.headers["X-Forwarded-Proto"] || event.headers["x-forwarded-proto"]) === "http" ? "http" : "https";
  return new URL(`${path}${query ? `?${query}` : ""}`, `${protocol}://${hostname}`);
}
function awsEventQuery(event) {
  if (typeof event.rawQueryString === "string") {
    return event.rawQueryString;
  }
  const queryObj = {
    ...event.queryStringParameters,
    ...event.multiValueQueryStringParameters
  };
  return stringifyQuery(queryObj);
}
function awsEventHeaders(event) {
  const headers2 = new Headers();
  for (const [key, value] of Object.entries(event.headers)) {
    if (value) {
      headers2.set(key, value);
    }
  }
  if ("cookies" in event && event.cookies) {
    for (const cookie of event.cookies) {
      headers2.append("cookie", cookie);
    }
  }
  return headers2;
}
function awsEventBody(event) {
  if (!event.body) {
    return void 0;
  }
  if (event.isBase64Encoded) {
    return Buffer.from(event.body || "", "base64");
  }
  return event.body;
}
function awsResponseHeaders(response) {
  const headers2 = /* @__PURE__ */ Object.create(null);
  for (const [key, value] of response.headers) {
    if (value) {
      headers2[key] = Array.isArray(value) ? value.join(",") : String(value);
    }
  }
  const cookies = response.headers.getSetCookie();
  return cookies.length > 0 ? {
    headers: headers2,
    cookies,
    multiValueHeaders: { "set-cookie": cookies }
  } : { headers: headers2 };
}
const nitroApp = useNitroApp();
const handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
  const request = awsRequest(event, context);
  const response = await nitroApp.fetch(request);
  response.headers.set("transfer-encoding", "chunked");
  const httpResponseMetadata = {
    statusCode: response.status,
    ...awsResponseHeaders(response)
  };
  const body = response.body ?? new ReadableStream({ start(controller) {
    controller.enqueue("");
    controller.close();
  } });
  const writer = awslambda.HttpResponseStream.from(responseStream, httpResponseMetadata);
  const reader = body.getReader();
  await streamToNodeStream(reader, responseStream);
  writer.end();
});
async function streamToNodeStream(reader, writer) {
  let readResult = await reader.read();
  while (!readResult.done) {
    writer.write(readResult.value);
    readResult = await reader.read();
  }
  writer.end();
}
function fetchViteEnv(viteEnvName, input, init) {
  const envs = globalThis.__nitro_vite_envs__ || {};
  const viteEnv = envs[viteEnvName];
  if (!viteEnv) {
    throw HTTPError.status(404);
  }
  return Promise.resolve(viteEnv.fetch(toRequest(input, init)));
}
function ssrRenderer({ req }) {
  return fetchViteEnv("ssr", req);
}
const ssrRenderer$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  default: ssrRenderer
});
export {
  handler
};
