"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fsp = require("fs-promise");
const path = require("path");
const yargs = require("yargs");
const common_1 = require("./lib/common");
const packages_1 = require("./lib/packages");
const io_1 = require("./util/io");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
const versions_1 = require("./lib/versions");
if (!module.parent) {
    const all = !!yargs.argv.all;
    const packageNames = yargs.argv._;
    if (all && packageNames.length) {
        throw new Error("Can't combine --all with listed package names.");
    }
    if (all) {
        console.log("Validating all packages");
        util_1.done(doAll());
    }
    else if (packageNames.length) {
        console.log("Validating: " + JSON.stringify(packageNames));
        util_1.done(doValidate(packageNames));
    }
    else {
        main(common_1.Options.defaults);
    }
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const changed = yield versions_1.changedPackages(yield packages_1.AllPackages.read(options));
        yield doValidate(changed.map(c => c.typingsPackageName));
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function doAll() {
    return __awaiter(this, void 0, void 0, function* () {
        const packageNames = (yield packages_1.AllPackages.readTypings()).map(t => t.typingsPackageName).sort();
        yield doValidate(packageNames);
    });
}
function doValidate(packageNames) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.loggerWithErrors();
        yield validatePackages(packageNames, common_1.settings.validateOutputPath, log);
        const { infos, errors } = logResult();
        yield Promise.all([
            logging_1.writeLog("validate.md", infos),
            logging_1.writeLog("validate-errors.md", errors)
        ]);
    });
}
function validatePackages(packageNames, outPath, log) {
    return __awaiter(this, void 0, void 0, function* () {
        log.info("");
        log.info("Using output path: " + outPath);
        log.info("Running tests....");
        log.info("");
        const failed = [];
        const passed = [];
        try {
            yield fsp.remove(outPath);
            yield fsp.mkdirp(outPath);
        }
        catch (e) {
            log.error("Could not recreate output directory. " + e);
            return;
        }
        // Run the tests
        yield util_1.nAtATime(25, packageNames, (packageName) => __awaiter(this, void 0, void 0, function* () {
            if (yield validatePackage(packageName, outPath, log)) {
                passed.push(packageName);
            }
            else {
                failed.push(packageName);
            }
        }));
        // Write results
        log.info("");
        log.info("");
        log.info(`Total  ${packageNames.length}`);
        log.info(`Passed ${passed.length}`);
        log.info(`Failed ${failed.length}`);
        log.info("");
        if (failed.length) {
            log.info(`These packages failed: ${failed}`);
        }
    });
}
function validatePackage(packageName, outputDirecory, mainLog) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.quietLoggerWithErrors();
        let passed = false;
        try {
            const packageDirectory = path.join(outputDirecory, packageName);
            log.info("");
            log.info("Processing `" + packageName + "`...");
            yield fsp.mkdirp(packageDirectory);
            yield writePackage(packageDirectory, packageName);
            if ((yield runCommand("npm", log, packageDirectory, "../../node_modules/npm/bin/npm-cli.js", "install")) &&
                (yield runCommand("tsc", log, packageDirectory, "../../node_modules/typescript/lib/tsc.js"))) {
                yield fsp.remove(packageDirectory);
                log.info("Passed.");
                passed = true;
            }
        }
        catch (e) {
            log.info("Error: " + e);
            log.info("Failed!");
        }
        // Write the log as one entry to the main log
        logging_1.moveLogsWithErrors(mainLog, logResult());
        console.info(`${packageName} -- ${passed ? "Passed" : "Failed"}.`);
        return passed;
    });
}
function writePackage(packageDirectory, packageName) {
    return __awaiter(this, void 0, void 0, function* () {
        // Write package.json
        yield io_1.writeJson(path.join(packageDirectory, "package.json"), {
            name: `${packageName}_test`,
            version: "1.0.0",
            description: "test",
            author: "",
            license: "ISC",
            repository: "https://github.com/Microsoft/types-publisher",
            dependencies: { [packages_1.fullPackageName(packageName)]: "latest" }
        });
        // Write tsconfig.json
        yield io_1.writeJson(path.join(packageDirectory, "tsconfig.json"), {
            compilerOptions: {
                module: "commonjs",
                target: "es5",
                noImplicitAny: false,
                strictNullChecks: false,
                noEmit: true,
                lib: ["es5", "es2015.promise", "dom"]
            }
        });
        // Write index.ts
        yield io_1.writeFile(path.join(packageDirectory, "index.ts"), `/// <reference types="${packageName}" />\r\n`);
    });
}
// Returns whether the command succeeded.
function runCommand(commandDescription, log, directory, cmd, ...args) {
    return __awaiter(this, void 0, void 0, function* () {
        const nodeCmd = `node ${cmd} ${args.join(" ")}`;
        log.info(`Run ${nodeCmd}`);
        const { error, stdout, stderr } = yield util_1.exec(nodeCmd, directory);
        if (error) {
            log.error(stderr);
            log.info(stdout);
            log.error(`${commandDescription} failed: ${JSON.stringify(error)}`);
            log.info(`${commandDescription} failed, refer to error log`);
            return false;
        }
        else {
            log.info(stdout);
            return true;
        }
    });
}
//# sourceMappingURL=validate.js.map