import { fromPath } from 'pdf2pic';

async function run() {
  const options = {
    density: 300,
    format: 'png',
    width: 1200,
    height: 1600,
    savePath: undefined, // don't save, return buffer
  };

  try {
    const storeAsImage = fromPath("C:/dummy.pdf", options);
    console.log("fromPath succeeded");
  } catch(e) {
    console.error("Error inside fromPath:", e);
  }
}

run();
