import { ProxyAgent, setGlobalDispatcher } from "undici";

let initialised = false;

export function initProxy() {
  if (initialised) return;
  initialised = true;

  let proxy = process.env.https_proxy || process.env.http_proxy;
  if (proxy) {
      if (!proxy.startsWith("http://") && !proxy.startsWith("https://")) {
	  proxy = "http://"+proxy;
      }
      console.log("setting global dispatcher "+proxy);
      setGlobalDispatcher(new ProxyAgent(proxy));
  }
}
