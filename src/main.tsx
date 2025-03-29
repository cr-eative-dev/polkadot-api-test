import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { wnd } from '@polkadot-api/descriptors'
import { createClient, Binary } from 'polkadot-api'
import { getSmProvider } from 'polkadot-api/sm-provider'
import { chainSpec } from 'polkadot-api/chains/westend2';
import { start } from 'polkadot-api/smoldot';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const smoldot = start();

const chain = await smoldot.addChain({
  chainSpec
})

const provider = getSmProvider(chain);

const client = createClient(provider);

const typedApi = client.getTypedApi(wnd);

const token = await typedApi.compatibilityToken;

const account = await typedApi.query.System.Account.getValue("5FxrUu1PUugUYs6HQ83bDswjGLyHYTEzm7yqmrkKVPaYe71Y")


console.log(typedApi.constants.System.SS58Prefix(token));

const tx = typedApi.tx.System.remark({
  remark: Binary.fromText("Hello World")
})

const encodedData = await tx.getEncodedData();

const result = await typedApi.apis.TransactionPaymentCallApi.query_call_info(
  tx.decodedCall,
  0
);

console.log(result);

const sudoAccount = await typedApi.query.Sudo.Key.getValue();
if (sudoAccount !== undefined) {
  console.log("Sudo acc:", sudoAccount.toString());
} else {
  console.log("Sudo acc is undefined");
}

if (sudoAccount !== undefined) {
  const sudoAccountInfo = await typedApi.query.System.Account.getValue(sudoAccount);
  console.log("Sudo acc balance:", sudoAccountInfo.data.free.toString());
} else {
  console.log("Sudo account is undefined, cannot fetch account info.");
}

const proxyEntries = await typedApi.query.Proxy.Proxies.getEntries();

const anyProxies = proxyEntries.flatMap((entry) => entry.value[0].filter((v) => v.proxy_type.type === "Any")).map((v) => v.delegate);

const anyProxiesUnique = new Set(anyProxies)

console.log("Any Proxies:", anyProxiesUnique);
