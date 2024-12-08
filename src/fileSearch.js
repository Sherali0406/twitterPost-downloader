const path = require('path');

const filePath = path.join(__dirname, 'folder', 'file.txt');
console.log("To'liq yo'l:", filePath); // /Users/username/project/src/folder/file.txt

console.log("Fayl nomi:", path.basename(filePath)); // file.txt
console.log("Kengaytma:", path.extname(filePath)); // .txt
