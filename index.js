#! /usr/bin/env node
const program = require("commander")
const copyPaste = require("copy-paste")
const Tesseract = require("tesseract.js")
const Progress = require("progress")
const PkgJson = require("./package.json")
const fs = require("fs");
const langs = ["afr", "ara", "aze", "bel", "ben", "ben", "bul", "cat", "ces", "chi_sim", "chi_tra", "chr", "dan", "deu", "ell", "eng", "enm", "epo", "epo_alt", "equ", "est", "eus", "fin", "fra", "frk", "frm", "glg", "grc", "heb", "hin", "hrv", "hun", "ind", "isl", "ita", "ita_old", "jpn", "kan", "kor", "lav", "lit", "mal", "mkd", "mlt", "msa", "nld", "nor", "pol", "por", "ron", "rus", "slk", "slv", "spa", "spa_old", "sqi", "srp", "swa", "swe", "tam", "tel", "tgl", "tha", "tur", "ukr", "vie"]

program
    .usage("PATHS [options]")
    .description(PkgJson.description)
    .version(PkgJson.version)
    .option("-l, --lang [language]", "language of the text in the image.")
    .option("-c, --clean-up", "removes the generated language data file (.traineddata) after the image recognition job has finished")
    .option("-p, --print", "prints out the text in the image.\n\nFull language list can be found here: \nhttps://github.com/naptha/tesseract.js/blob/master/docs/tesseract_lang_list.md")
    .option("-w, --write", "writes the text from the images to files in the same directory with the same names but as a text file")
    .parse(process.argv)

const errorMessage = validateArgs(program)
if (errorMessage) {
    console.error(`\n${errorMessage}`)
    program.help()
    return
}

start()

async function start() {
    for (var i = 0; i < program.args.length;i++) {
        await recognize({
            imagePath: program.args[i], // file path
            lang: program.lang,
            printResult: program.print,
            cleanup: program.cleanUp,
            writeToFile: program.write,
        })
    }
    //sleep so the process has time to print everything out
    await sleep(1000)
    process.exit()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validateArgs(args) {
    if (!args.args.length || !args.args[0]){
        return "No Path Specified"
    }

    if (!fs.existsSync(args.args[0])) {
        return `File path not found: ${args.args[0]}`;
    }

    if (args.lang && langs.indexOf(args.lang) === -1) {
        return "Invalid Language!"
    }
    return null;
}

async function recognize({ imagePath, lang = 'eng', printResult = false, cleanup = false, writeToFile = false}) {
    const bar = new Progress("recognizing [:bar] :percent :elapseds", {total: 100})
    let prev = 0
    await Tesseract.recognize(imagePath, {
        lang,
        tessedit_create_txt: false,
    })
        .progress(p => {
            const nextVal = Math.floor(p.progress * 100)
            if (nextVal && nextVal > prev) {
                bar.tick()
                prev++
            }
        })
        .catch(err => {
            console.log(err)
        })
        .then(result => {
            if (prev < 100) {
                bar.tick(100 - prev)
            }
            if (cleanup) {
                fs.unlinkSync(`${lang}.traineddata`)
            }
            copyPaste.copy(result.text, () => {
                if(printResult) {
                    console.log("\nResult:\n" + result.text.slice(0, result.text.length - 1))
                }

                console.log("Finished copying to clipboard!")
                if(writeToFile) {
                    fs.writeFile(imagePath.substr(0, imagePath.lastIndexOf("."))+'.txt', result.text, (err)=>{
                        if (err) console.log(err)
                    })
                }
            })
        })
}
