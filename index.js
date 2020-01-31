let STMT_Break = function (label) { this.label = label }
let STMT_Continue = function (label) { this.label = label }
let STMT_Return = function (value) { this.value = value }

let Interper = function (native) {
    this.native = native
    this.globalScope = { vars: {} }
    this.scope = this.globalScope
    this.strict = false
}

Interper.prototype.execute = function (code) {
    this.code = code

    let ast
    if (typeof module === 'object' && module.exports) {
        ast = require('./acorn').parse(code)
    } else {
        ast = acorn.parse(code)
    }

    return this.step(ast)
}

Interper.prototype.step = function (node) {
    let warks = {
        Program: this.stepProgram,
        Identifier: this.stepIdentifier,
        Literal: this.stepLiteral,
        RegExpLiteral: this.stepRegExpLiteral,
        ExpressionStatement: this.stepExpressionStatement,
        BlockStatement: this.stepBlockStatement,
        EmptyStatement: this.stepEmptyStatement,
        DebuggerStatement: this.stepDebuggerStatement,
        WithStatement: this.stepWithStatement,
        ReturnStatement: this.stepReturnStatement,
        LabeledStatement: this.stepLabeledStatement,
        BreakStatement: this.stepBreakStatement,
        ContinueStatement: this.stepContinueStatement,
        Choice: this.stepChoice,
        IfStatement: this.stepIfStatement,
        SwitchStatement: this.stepSwitchStatement,
        SwitchCase: this.stepSwitchCase,
        Exceptions: this.stepExceptions,
        ThrowStatement: this.stepThrowStatement,
        TryStatement: this.stepTryStatement,
        CatchClause: this.stepCatchClause,
        WhileStatement: this.stepWhileStatement,
        DoWhileStatement: this.stepDoWhileStatement,
        ForStatement: this.stepForStatement,
        ForInStatement: this.stepForInStatement,
        FunctionDeclaration: this.stepFunctionDeclaration,
        VariableDeclaration: this.stepVariableDeclaration,
        VariableDeclarator: this.stepVariableDeclarator,
        Expressions: this.stepExpressions,
        ThisExpression: this.stepThisExpression,
        ArrayExpression: this.stepArrayExpression,
        ObjectExpression: this.stepObjectExpression,
        Property: this.stepProperty,
        FunctionExpression: this.stepFunctionExpression,
        UnaryExpression: this.stepUnaryExpression,
        UpdateExpression: this.stepUpdateExpression,
        BinaryExpression: this.stepBinaryExpression,
        AssignmentExpression: this.stepAssignmentExpression,
        LogicalExpression: this.stepLogicalExpression,
        MemberExpression: this.stepMemberExpression,
        ConditionalExpression: this.stepConditionalExpression,
        CallExpression: this.stepCallExpression,
        NewExpression: this.stepNewExpression,
        SequenceExpression: this.stepSequenceExpression,
        Pattern: this.stepPattern
    }
    let executor = (warks[node['type']]).bind(this, node)
    return executor()
}

let Reference = function (obj, propName) {
    this.obj = obj
    this.name = propName
}

Reference.prototype.setValue = function (value) {
    this.obj[this.name] = value
}

Reference.prototype.getValue = function () {
    if (this.name instanceof Function) {
        return this.name
    }

    if (this.obj === undefined || this.obj === null) {
        return undefined
    }

    if (this.name === undefined || this.name === null) {
        return undefined
    }

    return this.obj[this.name]
}

Interper.prototype.getReferenceOfNode = function (node) {
    if (node.type === 'Identifier') {
        let obj = this.getScopeForName(node.name)
        if (obj && obj !== this.native) {
            obj = obj.vars
        }
        return new Reference(obj, node.name)
    } else if (node.type === 'MemberExpression') {
        let obj = this.step(node.object)
        let name = this.getNodeName(node)
        return new Reference(obj, name)
    } else if (node.type === 'FunctionExpression') {
        return new Reference(this.native, this.createFunction(node))
    } else {
        return null
    }
}

Interper.prototype.getScopeForName = function (name) {
    let scope = this.scope

    while (scope) {
        if (this.hasVar(name, scope)) {
            return scope
        }

        if (scope.environment) {
            scope = scope.environment
        } else {
            scope = scope.parent
        }
    }

    if (this.native && this.native.hasOwnProperty(name)) {
        return this.native
    }

    return undefined
}

Interper.prototype.defineVar = function (name, value, scope) {
    scope = scope || this.scope
    scope.vars[name] = value
}

Interper.prototype.getVar = function (name, scope) {
    scope = scope || this.scope
    return scope.vars[name]
}

Interper.prototype.hasVar = function (name, scope) {
    scope = scope || this.scope
    return scope.vars.hasOwnProperty(name)
}

Interper.prototype.getNodeName = function (node) {
    if (node.type === 'Identifier') {
        return node.name
    } else if (node.type === 'Literal') {
        return node.value
    } else if (node.type === 'MemberExpression') {
        return node.computed ? this.step(node.property) : node.property.name
    } else {
        throw new Error()
    }
}

Interper.prototype.executeInNewScope = function (func) {
    this.scope = { parent: this.scope, vars: {} }
    let value = func(this.scope)
    this.scope = this.scope.parent

    return value
}

Interper.prototype.isStmtControlFlow = function (value) {
    return (value instanceof STMT_Break || value instanceof STMT_Continue || value instanceof STMT_Return)
}

Interper.prototype.createFunction = function (node) {
    let self = this
    let environment = this.scope

    let func = function (...args) {
        return self.executeInNewScope(scope => {
            self.hoistDeclarations(node.body, scope)

            scope.environment = environment

            node.params.forEach(paramNode => {
                self.defineVar(paramNode.name, args.shift())
            })

            for (statement of node.body.body) {
                let stmtValue = self.step(statement)
                if (stmtValue instanceof STMT_Return) {
                    return stmtValue.value
                }
            }
        })
    }

    func._vm_function_ = true
    return func
}

Interper.prototype.hoistDeclarations = function (node, scope) {
    if (!node) {
        return
    }

    switch (node.type) {
        case 'FunctionDeclaration': {
            if (!this.hasVar(scope)) {
                this.defineVar(node.id.name, this.createFunction(node), scope)
            }
            break
        }
        case 'VariableDeclaration': {
            if (node.kind === 'var') {
                for (let declaration of node.declarations) {
                    this.defineVar(this.getNodeName(declaration.id, undefined, scope))
                }
            }
            break
        }
        case 'Program': {
            for (let statement of node.body) {
                this.hoistDeclarations(statement, scope)
            }
            break
        }
        case 'BlockStatement': {
            for (let block of node.body) {
                this.hoistDeclarations(block, scope)
            }
            break
        }
        case 'WhileStatement': {
            this.hoistDeclarations(node.body, scope)
            break
        }
        case 'DoWhileStatement': {
            this.hoistDeclarations(node.body, scope)
            break
        }
        case 'ForStatement': {
            this.hoistDeclarations(node.init, scope)
            this.hoistDeclarations(node.body, scope)
            break
        }
        case 'ForInStatement': {
            this.hoistDeclarations(node.left, scope)
            this.hoistDeclarations(node.body, scope)
            break
        }
        case 'IfStatement': {
            this.hoistDeclarations(node.consequent, scope)
            this.hoistDeclarations(node.alternate, scope)
            break
        }
        default: break
    }
}

Interper.prototype.stepProgram = function (node) {
    this.hoistDeclarations(node, this.scope)

    let value
    node.body.forEach(element => {
        let ret = this.step(element)
        if (element.type !== 'FunctionDeclaration' && element.type !== 'VariableDeclaration') {
            value = ret
        }
    });

    return value
}

Interper.prototype.stepIdentifier = function (node) {
    return this.getReferenceOfNode(node).getValue()
}
Interper.prototype.stepLiteral = function (node) {
    if (node.value === 'use strict') {
        this.strict = true
    }

    return node.value
}
Interper.prototype.stepRegExpLiteral = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepExpressionStatement = function (node) {
    return this.step(node.expression)
}
Interper.prototype.stepBlockStatement = function (node) {
    return this.executeInNewScope(_ => {
        let stmtValue
        for (let element of node.body) {
            stmtValue = this.step(element)
            if (this.isStmtControlFlow(stmtValue)) {
                return stmtValue
            }
        }
        return stmtValue
    })
}
Interper.prototype.stepEmptyStatement = function (node) {
}
Interper.prototype.stepDebuggerStatement = function (node) {
    debugger;
}
Interper.prototype.stepWithStatement = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepReturnStatement = function (node) {
    if (node.argument) {
        return new STMT_Return(this.step(node.argument))
    }
    return new STMT_Return()
}
Interper.prototype.stepLabeledStatement = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepBreakStatement = function (node) {
    return new STMT_Break(node.label)
}
Interper.prototype.stepContinueStatement = function (node) {
    return new STMT_Continue(node.label)
}
Interper.prototype.stepChoice = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepIfStatement = function (node) {
    let condition = this.step(node.test)

    return this.executeInNewScope(_ => {
        if (condition) {
            return this.step(node.consequent)
        } else {
            if (node.alternate) {
                return this.step(node.alternate)
            }
        }
    })
}
Interper.prototype.stepSwitchStatement = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepSwitchCase = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepExceptions = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepThrowStatement = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepTryStatement = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepCatchClause = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepWhileStatement = function (node) {
    let stmtValue
    while (this.step(node.test)) {
        stmtValue = this.executeInNewScope(_ => {
            return this.step(node.body)
        })

        if (stmtValue instanceof STMT_Break) {
            break
        } else if (stmtValue instanceof STMT_Continue) {
            continue
        } else if (stmtValue instanceof STMT_Return) {
            return stmtValue
        }
    }
    return stmtValue
}
Interper.prototype.stepDoWhileStatement = function (node) {
    let stmtValue
    do {
        stmtValue = this.executeInNewScope(_ => {
            return this.step(node.body)
        })

        if (stmtValue instanceof STMT_Continue) {
            continue
        } else if (stmtValue instanceof STMT_Break) {
            break
        } else if (stmtValue instanceof STMT_Return) {
            return stmtValue
        }
    } while (this.step(node.test))

    return stmtValue
}
Interper.prototype.stepForStatement = function (node) {
    return this.executeInNewScope(_ => {
        if (node.init) {
            this.step(node.init)
        }

        let stmtValue
        while (this.step(node.test)) {
            let stmtValue = this.step(node.body)
            this.step(node.update)

            if (stmtValue instanceof STMT_Continue) {
                continue
            } else if (stmtValue instanceof STMT_Break) {
                break
            } else if (stmtValue instanceof STMT_Return) {
                return stmtValue
            }
        }
        return stmtValue
    })
}
Interper.prototype.stepForInStatement = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepFunctionDeclaration = function (node) {
    if (!this.hasVar(node.id.name)) {
        this.defineVar(node.id.name, this.createFunction(node))
    }
}
Interper.prototype.stepVariableDeclaration = function (node) {
    node.declarations.forEach(element => {
        let ref = this.getReferenceOfNode(element.id)

        if (node.kind !== 'var' || !ref) {
            this.step(element)
        } else {
            ref.setValue(element.init ? this.step(element.init) : undefined)
        }
    })
}
Interper.prototype.stepVariableDeclarator = function (node) {
    let name = this.getNodeName(node.id)

    if (!this.hasVar(name)) {
        this.defineVar(name, undefined)
    }

    if (node.init) {
        this.defineVar(name, this.step(node.init))
    }
}
Interper.prototype.stepExpressions = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepThisExpression = function (node) {
    return this._curThis
}
Interper.prototype.stepArrayExpression = function (node) {
    return node.elements.map(element => this.step(element))
}
Interper.prototype.stepObjectExpression = function (node) {
    let obj = {}
    node.properties.forEach(prop => {
        let key = this.getNodeName(prop.key);
        obj[key] = this.step(prop.value)
    })
    return obj
}
Interper.prototype.stepProperty = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepFunctionExpression = function (node) {
    return this.createFunction(node)
}
Interper.prototype.stepUnaryExpression = function (node) {
    let value = this.step(node.argument)

    switch (node.operator) {
        case '-': return -value;
        case '+': return +value;
        case '!': return !value;
        case '~': return ~value;
        case 'typeof': return typeof value;
        case 'void': return void value;
        case 'delete': return delete value;
    }
    throw new Error(`${node.type}`)
}
Interper.prototype.stepUpdateExpression = function (node) {
    let ref = this.getReferenceOfNode(node.argument)
    let value = ref.getValue()
    let updatedValue = value

    if (node.operator === '++') {
        updatedValue++
    } else if (node.operator === '--') {
        updatedValue--
    } else {
        throw new SyntaxError()
    }

    ref.setValue(updatedValue)
    return node.prefix ? updatedValue : value
}
Interper.prototype.stepBinaryExpression = function (node) {
    let leftValue = this.step(node.left)
    let rightValue = this.step(node.right)

    switch (node.operator) {
        case '==': return leftValue == rightValue
        case '!=': return leftValue != rightValue
        case '===': return leftValue === rightValue
        case '!==': return leftValue !== rightValue
        case '<': return leftValue < rightValue
        case '<=': return leftValue <= rightValue
        case '>': return leftValue > rightValue
        case '>=': return leftValue >= rightValue
        case '<<': return leftValue << rightValue
        case '>>': return leftValue >> rightValue
        case '>>>': return leftValue >>> rightValue
        case '+': return leftValue + rightValue
        case '-': return leftValue - rightValue
        case '*': return leftValue * rightValue
        case '/': return leftValue / rightValue
        case '%': return leftValue % rightValue
        case '|': return leftValue | rightValue
        case '^': return leftValue ^ rightValue
        case '&': return leftValue & rightValue
        case 'in': return leftValue in rightValue
        case 'instanceof': return leftValue instanceof rightValue
        default: throw new Error('')
    }

}
Interper.prototype.stepAssignmentExpression = function (node) {
    const rightValue = this.step(node.right)
    let ref = this.getReferenceOfNode(node.left)
    if (!this.strict) {
        if (!ref || !ref.obj) {
            this.defineVar(this.getNodeName(node.left), undefined, this.globalScope)
            ref = this.getReferenceOfNode(node.left)
        }
    }
    let value = ref.getValue()

    switch (node['operator']) {
        case '=': value = rightValue; break;
        case '+=': value += rightValue; break;
        case '-=': value -= rightValue; break;
        case '*=': value *= rightValue; break;
        case '/=': value /= rightValue; break;
        case '%=': value %= rightValue; break;
        case '<<=': value <<= rightValue; break;
        case '>>=': value >>= rightValue; break;
        case '>>>=': value >>>= rightValue; break;
        case '&=': value &= rightValue; break;
        case '^=': value ^= rightValue; break;
        case '|=': value |= rightValue; break;
        default:
            throw SyntaxError('Unknown assignment expression: ' + node['operator']);
    }

    ref.setValue(value)
    return value
}
Interper.prototype.stepLogicalExpression = function (node) {
    let leftValue = this.step(node.left)
    let rightValue = this.step(node.right)

    switch (node.operator) {
        case '||': return leftValue || rightValue
        case '&&': return leftValue && rightValue
        default: throw SyntaxError(`Unknown operator: ${node.operator}`)
    }
}
Interper.prototype.stepMemberExpression = function (node) {
    return this.getReferenceOfNode(node).getValue()
}
Interper.prototype.stepConditionalExpression = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepCallExpression = function (node) {
    let args = node.arguments.map(exp => this.step(exp))

    let obj
    let callee

    if (node.callee.type === 'CallExpression') {
        obj = this._callObj || this.scope.vars
        callee = this.step(node.callee)
        this._callObj = callee
    } else {
        let funcRef = this.getReferenceOfNode(node.callee)
        callee = funcRef.getValue()
        obj = funcRef.obj

        this._callObj = null
    }

    let preThis = this._curThis
    this._curThis = obj
    let ret = callee.apply(obj, args)
    this._curThis = preThis

    return ret
}
Interper.prototype.stepNewExpression = function (node) {
    let func = this.getReferenceOfNode(node.callee).getValue()
    let args = node.arguments.map(exp => this.step(exp))

    if (func._vm_function_) {
        let obj = Object.create(func.prototype)
        let preThis = this._curThis
        this._curThis = obj

        func.apply(obj, args)

        this._curThis = preThis

        return obj
    } else {
        return new func(args)
    }
}
Interper.prototype.stepSequenceExpression = function (node) {
    throw new Error(`${node.type}`)
}
Interper.prototype.stepPattern = function (node) {
    throw new Error(`${node.type}`)
}

if (typeof module === 'object' && module.exports) {
    module.exports = Interper
} else {
    Interper = Interper
}
