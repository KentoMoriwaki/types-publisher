"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs_extra_1 = require("fs-extra");
const yargs = require("yargs");
const npm_client_1 = require("./lib/npm-client");
const packages_1 = require("./lib/packages");
const settings_1 = require("./lib/settings");
const versions_1 = require("./lib/versions");
const io_1 = require("./util/io");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
const packageName = "types-registry";
const registryOutputPath = util_1.joinPaths(settings_1.outputPath, packageName);
const readme = `This package contains a listing of all packages published to the @types scope on NPM.
Generated by [types-publisher](https://github.com/Microsoft/types-publisher).`;
if (!module.parent) {
    const dry = !!yargs.argv.dry;
    util_1.done(main(dry));
}
function main(dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const [log, logResult] = logging_1.logger();
        log("=== Publishing types-registry ===");
        const { version: oldVersion, contentHash: oldContentHash } = yield versions_1.fetchNpmInfo(packageName);
        // Don't include not-needed packages in the registry.
        const typings = yield packages_1.AllPackages.readTypings();
        const registry = JSON.stringify(generateRegistry(typings), undefined, 4);
        const newContentHash = util_1.computeHash(registry);
        assert.equal(oldVersion.major, 0);
        assert.equal(oldVersion.minor, 1);
        const newVersion = `0.1.${oldVersion.patch + 1}`;
        const packageJson = generatePackageJson(newVersion, newContentHash);
        yield generate(registry, packageJson);
        if (oldContentHash !== newContentHash) {
            log("New packages have been added, so publishing a new registry.");
            yield publish(packageJson, newVersion, dry);
        }
        else {
            log("No new packages published, so no need to publish new registry.");
            // Just making sure...
            yield validate();
        }
        yield logging_1.writeLog("publish-registry.md", logResult());
    });
}
exports.default = main;
function generate(registry, packageJson) {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs_extra_1.mkdir(registryOutputPath);
        yield writeOutputJson("package.json", packageJson);
        yield writeOutputFile("index.json", registry);
        yield writeOutputFile("README.md", readme);
        function writeOutputJson(filename, content) {
            return io_1.writeJson(outputPath(filename), content);
        }
        function writeOutputFile(filename, content) {
            return io_1.writeFile(outputPath(filename), content);
        }
        function outputPath(filename) {
            return util_1.joinPaths(registryOutputPath, filename);
        }
    });
}
function publish(packageJson, version, dry) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield npm_client_1.default.create({ defaultTag: "next" });
        yield client.publish(registryOutputPath, packageJson, dry);
        // Don't set it as "latest" until *after* it's been validated.
        yield validate();
        yield client.tag(packageName, version, "latest");
    });
}
function validate() {
    return __awaiter(this, void 0, void 0, function* () {
        yield fs_extra_1.emptyDir(settings_1.validateOutputPath);
        yield io_1.writeJson(util_1.joinPaths(settings_1.validateOutputPath, "package.json"), {
            name: "validate",
            version: "0.0.0",
            description: "description",
            readme: "",
            license: "",
            repository: {},
        });
        const npmPath = util_1.joinPaths(__dirname, "..", "node_modules", "npm", "bin", "npm-cli.js");
        const err = (yield util_1.execAndThrowErrors(`node ${npmPath} install types-registry@next ${io_1.npmInstallFlags}`, settings_1.validateOutputPath)).trim();
        if (err) {
            console.error(err);
        }
        yield io_1.assertDirectoriesEqual(registryOutputPath, util_1.joinPaths(settings_1.validateOutputPath, "node_modules", "types-registry"), {
            ignore: f => f === "package.json"
        });
    });
}
function generatePackageJson(version, typesPublisherContentHash) {
    return {
        name: packageName,
        version,
        description: "A registry of TypeScript declaration file packages published within the @types scope.",
        repository: {
            type: "git",
            url: "https://github.com/Microsoft/types-publisher.git"
        },
        keywords: [
            "TypeScript",
            "declaration",
            "files",
            "types",
            "packages"
        ],
        author: "Microsoft Corp.",
        license: "MIT",
        typesPublisherContentHash,
    };
}
function generateRegistry(typings) {
    const entries = {};
    for (const { name } of typings) {
        entries[name] = 1;
    }
    return { entries };
}
//# sourceMappingURL=publish-registry.js.map