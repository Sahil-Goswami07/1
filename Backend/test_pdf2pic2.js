import { fromPath } from 'pdf2pic';

async function run() {
  const options = {
    density: 300,
    format: 'png',
    width: 1200,
    height: 1600
  };

  try {
    const storeAsImage = fromPath("C:/dummy.pdf", options);
    const res = await storeAsImage(1, { responseType: "base64" }); 
    console.log("Res:", res);
  } catch(e) {
    console.error("Error:", e.message);
  }
}

run();
