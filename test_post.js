const fetch = require('node-fetch');
const url = "https://script.google.com/macros/s/AKfycbwQW0a52zFKVFPD1wM1KXY98uDcZl5tSUJo1xcFSNM-aBTQyW80_cr3ZIKv26P1iIfV/exec";
fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'updateSubjects', subjects: { "test": {id: "test", name: "test"} } })
})
.then(res => res.text())
.then(text => console.log("Response:", text))
.catch(err => console.error("Error:", err));
