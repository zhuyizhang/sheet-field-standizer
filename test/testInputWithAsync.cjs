const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main () {
  rl.question("Please enter something: ", (answer) => {
    console.log(`You entered: ${answer}`);
    rl.close();
    console.log("then.............");
  });

  console.log("then.............");
};

main();