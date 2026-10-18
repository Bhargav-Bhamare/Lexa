const express = require("express");

const app = express();

const port = 3000;

app.get("/api/health",(req,res) =>{
    res.json({
        status: "ok",
        message: "Lexa server is running",
        "app": "Lexa"
    });
});

app.listen(port, ()=>{
    console.log("Lexa is running sucessfully at Port 3000!")
})