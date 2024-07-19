console.log("Hello  ")

async function getData() {
  return await new Promise(resolve => setTimeout(resolve, 1000) )
}

getData().then(() => {
  console.log("Helppppppppppppp");
})

console.log("  World")

// (async ()=>{
//   await getData().then(() => {
//     console.log("Helppppppppppppp");
//   })
// })();