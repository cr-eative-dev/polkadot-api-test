import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { wnd } from '@polkadot-api/descriptors'
import { createClient, Binary } from 'polkadot-api'
import { getSmProvider } from 'polkadot-api/sm-provider'
import { chainSpec } from 'polkadot-api/chains/westend2';
import { start } from 'polkadot-api/smoldot';
import { getInjectedExtensions, connectInjectedExtension } from 'polkadot-api/pjs-signer'
import { JsonRpcProvider } from '@polkadot-api/json-rpc-provider'

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

export function withLogsRecorder(
  persistLog: (msg: string) => void,
  // Provider wrapped
  provider: JsonRpcProvider
): JsonRpcProvider {
  return (onMessage) => {
    const connection = provider(onMessage);

    return {
      disconnect() {
        persistLog("Disconnecting provider");
        connection.disconnect();
      },
      send(message) {
        persistLog(`Sending message: ${JSON.stringify(message)}`);
        connection.send(message);
      },
    };
  };
}

// const loggedProvider = withLogsRecorder(console.log, provider)

const client = createClient(provider);

const typedApi = client.getTypedApi(wnd);

const token = await typedApi.compatibilityToken;

const account = await typedApi.query.System.Account.getValue("5FxrUu1PUugUYs6HQ83bDswjGLyHYTEzm7yqmrkKVPaYe71Y")


console.log(typedApi.constants.System.SS58Prefix(token));

// const tx = typedApi.tx.System.remark({
//   remark: Binary.fromText("Hello World")
// })

// const encodedData = await tx.getEncodedData();

// const result = await typedApi.apis.TransactionPaymentCallApi.query_call_info(
//   tx.decodedCall,
//   0
// );

// console.log(result);

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

const maxProxies = typedApi.constants.Proxy.MaxProxies()

const maxProxiesValue = await maxProxies;
const thirdResult = proxyEntries.some((entry) => entry.value[0].length >= maxProxiesValue);

console.log("Third result:", thirdResult);

const extensionId = getInjectedExtensions()[0];
const extension = await connectInjectedExtension(extensionId);
console.log("Extension:", extension);

const accounts = extension.getAccounts();
console.log("Accounts:", accounts);

const PBA = accounts.find((account) => account.name === "PBA");

const tx = typedApi.tx.System.remark({
  remark: Binary.fromText("Hello World")
});

// const sudoTx = typedApi.tx.Sudo.sudo({
//   call: tx.decodedCall,
// });

(window as any).sendTx = async () => {
  if (PBA) {
    tx.signSubmitAndWatch(PBA.polkadotSigner).subscribe((evt) => { console.log("tx Event:", evt) });
  } else {
    console.error("PBA is undefined. Cannot send transaction.");
  }
};

// import { JsonRpcProvider } from "@polkadot-api/json-rpc-provider";

// function correlate(provider: JsonRpcProvider) {
//   let id = 0;
//   const pendingRequests = new Map();
//   let followId: string = "";
//   const connection = provider((msgStr) => {
//     const msg = JSON.parse(msgStr);

//     if (msg.id === followRequestId) {
//       if (msg.result?.followId) {
//         followId = msg.result.followId;
//         console.log(`chain head follow with id: ${followId}`);
//       } else if (msg.error) {
//         console.error("failed to connect")
//       }
//     }
//     else if (pendingRequests.has(msg.id)) {
//       const { resolve, reject } = pendingRequests.get(msg.id);

//       if (msg.error) {
//         reject(new Error(`RPC error: ${JSON.stringify(msg.error)}`));
//       } else if (msg.result) {
//         resolve(msg.result);
//       }

//       pendingRequests.delete(msg.id);
//     }

//     else if (msg.method === "chainHead_followEvent") {
//       const event = msg.params.result;
//       if (event?.event === "newBlock") {
//         console.log(`New block: ${event.blockHash}`);
//       } else if (event?.event === "bestBlockChanged") {
//         console.log(`Best block changed: ${event.blockHash}`);
//       } else if (event?.event === "finalized") {
//         console.log(`Blocks finalized: ${event.finalizedBlockHashes.join(", ")}`);
//       }
//     }

//   });

//   const followRequestId = id++;
//   connection.send(
//     JSON.stringify({
//       id: followRequestId,
//       jsonrpc: "2.0",
//       method: "chainHead_v1_follow",
//       params: [true],
//     })
//   );

//   return {
//     getBody(hash: string): Promise<string[]> {
//       return new Promise((resolve, reject) => {
//         if (!followId) {
//           reject(new Error("Follow ID is not set"));
//           return;
//         }

//         const requestId = id++;
//         pendingRequests.set(requestId, { resolve, reject });

//         connection.send(
//           JSON.stringify({
//             id: requestId,
//             jsonrpc: "2.0",
//             method: "chainHead_v1_body",
//             params: [followId, hash],
//           })
//         );
//       });
//     },
//   };
// }

// const correlationExercise = correlate(provider);

// setTimeout(async () => {
//   try {
//     const bestBlocks = await typedApi.query.System.BlockHash.getEntries();
//     if (bestBlocks.length > 0) {
//       const latestHash = bestBlocks[bestBlocks.length - 1].value;
//       console.log(`Getting body for block: ${latestHash}`);

//       const body = await correlationExercise.getBody(latestHash.toString());
//       console.log("Block body:", body);
//     }
//   } catch (error) {
//     console.error("Error:", error);
//   }
// }, 5000);