"use strict";
const Lint = require("tslint");
const ts = require("typescript");
class Rule extends Lint.Rules.AbstractRule {
    apply(sourceFile) {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}
Rule.metadata = {
    ruleName: "export-just-namespace",
    description: "Forbid to `export = foo` where `foo` is a namespace and isn't merged with a function/class/type/interface.",
    optionsDescription: "Not configurable.",
    options: null,
    type: "functionality",
    typescriptOnly: true,
};
Rule.FAILURE_STRING = "Instead of `export =`-ing a namespace, use the body of the namespace as the module body.";
exports.Rule = Rule;
class Walker extends Lint.RuleWalker {
    visitSourceFile(node) {
        const exportEqualsNode = node.statements.find(isExportEquals);
        if (!exportEqualsNode) {
            return;
        }
        const expr = exportEqualsNode.expression;
        if (expr.kind !== ts.SyntaxKind.Identifier) {
            return;
        }
        const exportEqualsName = expr.text;
        if (exportEqualsName && isJustNamespace(node.statements, exportEqualsName)) {
            this.addFailureAtNode(exportEqualsNode, Rule.FAILURE_STRING);
        }
    }
}
function isExportEquals(node) {
    return node.kind === ts.SyntaxKind.ExportAssignment && !!node.isExportEquals;
}
/** Returns true if there is a namespace but there are no functions/classes with the name. */
function isJustNamespace(statements, exportEqualsName) {
    let anyNamespace = false;
    for (const statement of statements) {
        switch (statement.kind) {
            case ts.SyntaxKind.ModuleDeclaration:
                anyNamespace = anyNamespace || nameMatches(statement.name);
                break;
            case ts.SyntaxKind.VariableStatement:
                if (statement.declarationList.declarations.some(d => nameMatches(d.name))) {
                    // OK. It's merged with a variable.
                    return false;
                }
                break;
            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.InterfaceDeclaration:
                if (nameMatches(statement.name)) {
                    // OK. It's merged with a function/class/type/interface.
                    return false;
                }
                break;
        }
    }
    return anyNamespace;
    function nameMatches(nameNode) {
        return nameNode !== undefined && nameNode.kind === ts.SyntaxKind.Identifier && nameNode.text === exportEqualsName;
    }
}
/*
Tests:

OK:
    export = foo;
    declare namespace foo {}
    declare function foo(): void; // or interface, type, class

Error:
    export = foo;
    declare namespace foo {}

OK: (it's assumed to come from elsewhere)
    export = foo;
*/
//# sourceMappingURL=exportJustNamespaceRule.js.map