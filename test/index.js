var Interper = require("../index.js");
var assert = require("assert");
var fs = require('fs');

function _eval(code) {
	let interper = new Interper(global)
	return interper.execute(code)
}

function test(code) {
	assert.equal(_eval(code), eval(code))
}

it('hoisting global', function () {
	test(`
	function f1() {

		var n = 999;

		nAdd = function () { n += 1 }

		function f2() {
			return n
		}

		return f2;

	}

	var result = f1();

	result(); // 999
	nAdd();

	result(); // 1000
	`)
})

it('hoisting 5', function () {
	test(`
	function hoistVariable() {
		var foo = 10
		console.log(foo)  // 10
		if (true) {
			var foo = 5;
			console.log(foo) // 5， 局部作用域重新定义，但覆盖到函数级别
		}

		console.log(foo); // 5
		foo
	}

	hoistVariable();
	`)
})

it('hoisting 4', function () {
	test(`
	function hoistVariable() {
		if (!foo) {
			var foo = 5;
		}

		return foo
	}

	hoistVariable();
	`)
})

it('hoisting 3', function () {
	test(`
		a
		var a = 1
		a
	`)
})

it('hoisting 2', function () {
	test(`
		a = 10
		console.log(a) // a = 10
		if (false) {
			var a   // var 会提升变量声明，let不会
		}
	`)
})

it('hoisting 1', function () {
	test(`
		sum(1,2)
		function sum(a, b) { return a + b }
	`)
})

it('call 10', function () {
	assert.equal(_eval(`
	var name = "The Window";

	var object = {
		name: "My Object",

		getNameFunc: function () {
			var that = this;
			return function () {
				return that.name;
			};

		}

	};

	object.getNameFunc()()
	`), 'My Object')
})

it('call 9', function () {
	assert.equal(_eval(`
	var name = "The Window";

	var object = {
		name: "My Object",

		getNameFunc: function () {
			return function () {
				return this.name;
			};

		}

	};

	object.getNameFunc()()
	`), 'The Window')
})

it('closure 8', function () {
	test(`
	(function (a) {
  		return function(b) {
      		{
            	let e = 'ee'
         		return function(c) {
             		{  
                		let f = 'ff'
                		return function(d) {
                    		return a + b + c + d + e + f
                		}
             		}
         		}
      		}
  		}
	})('aa')('bb')('cc')('dd')
	`)
})

it('closure 7', function () {
	test(`
let h = 'hh';
(function (a) {
  return function(b) {
      {
            let e = 'ee'
         return function(c) {
             {  
                let f = 'ff'
                return function(d) {
                    return a + b + c + d + e + f + g + h
                }
                var g = 'gg'
             }
         }
      }
  }
})('aa')('bb')('cc')('dd')
	`)
})

it('closure 6', function () {
	test(`
		(function (a) {
  			return function(b) {
     			return function(c) {
					 return function(d) {
							return a + b + c + d
					 }
     			}
  			}
		})('aa')('bb')('cc')('dd')
	`)
})

it('closure 5', function () {
	test(`
		function makeWorker() {
  			let name = "Pete";

  			return function() {
				  return name
  			};
		}

		let name = "John";
		let work = makeWorker();
		work()
	`)
})

it('closure 4', function () {
	test(`
		function add() {
   			let a = 1;
  			const addOne = function(b) { return b + a; }
  			++a;
    		return addOne;
		}
		const addOne = add();
		addOne(1)
	`)
})


it('closure 3', function () {
	test(`
		let a = {name: 'Tom'}
		let func = (function (obj) {
			return function() {
				return obj.name
			}
		})(a)
		//a = {name: 'Sam'}
		a.name = 'Sam'
		func()
	`)
})

it('closure 2', function () {
	test(`
		let a = {name: 'Tom'}
		let func = (function (obj) {
			return function() {
				return obj.name
			}
		})(a)
		a = {name: 'Sam'}
		func()
	`)
})

it('closure 1', function () {
	test(`
		(function (obj) {
			return function () {
				return obj.abc;
			};
		})({abc: 'xxxyy'})()
	`)
})

it('md5', function () {
	var code = fs.readFileSync('test/md5.js', { encoding: 'UTF-8' });
	code += `
		md5('202cb962ac59075b964b07152d234b70')
	`
	test(code)
})

it('ObjectExpression', function () {
	let obj = _eval(`
		let obj ={
			a: 1,
			'b': 2
		}
		obj
	`)
	assert.equal(obj.a, 1)
	assert.equal(obj.b, 2)
})

it('new', function () {
	test(`
		let Persion = function(name, age) {
			this.name = name
			this.age = age
		}
		Persion.prototype.sayName = function() {return this.name}
		Persion.prototype.sayAge = function() {return this.age}
		let persion = new Persion('Tom', 23)

		persion instanceof Persion
	`)
})

it('function 6: anonymous funtions', function () {
	test(`(function(a, b){return a + b })(100, 2)`)
})

it('function 5', function () {
	let persion = _eval(`
		let Persion = function(name, age) {
			this.name = name
			this.age = age
		}
		Persion.prototype.sayName = function() {return this.name}
		Persion.prototype.sayAge = function() {return this.age}
		let persion = new Persion('Tom', 23)

		let ret = {
			'persion': persion,
			name : persion.sayName(),
			age : persion.sayAge()
		}
		ret
	`)
	assert.equal(persion.name, 'Tom')
	assert.equal(persion.persion.name, 'Tom')
	assert.equal(persion.age, 23)
	assert.equal(persion.persion.age, 23)
})

it('function 4', function () {
	test(`
		let Car = function() {}
		Car.prototype.constructor === Car
	`)
})

it('function 3', function () {
	test(`
		let Car = function() {}
		Car.prototype.constructor === Car
	`)
})

it('function 2', function () {
	test(`
		function test() {
			return 123
		}

		test(101,11)
	`)
})

it('function declaration', function () {
	test(`
		function sum(a,b) {
			return a+b
		}

		sum(101, 20)
	`)
})

it('native call/new native object', function () {
	test(`
		let str = new String('abcdef')
		str.toUpperCase()
	`)
})

it('native call', function () {
	test(`
		let n = parseInt('123')
		n
	`)
})

it('variable declaration', function () {
	test(`
		var a
		a = 'abc'
	`)
})

it('EmptyStatement', function () {
	test(`
		let a = 100
		{
			;
		}
		a
	`)
})

it('update: ++', function () {
	test(`
		var i = 1
		var b = (++i)+0
		b
	`)
})

it('update: ++', function () {
	test(`
		var i = 1
		var c = (i++)+0
		c
	`)
})

it('assigment', function () {
	let b = _eval(`
		let b = [1,2,3]
		{
    		b['a'] = 'tt'
		}
		b
	`)
	assert.equal(b[0], 1)
	assert.equal(b[1], 2)
	assert.equal(b[2], 3)
	assert.equal(b['a'], 'tt')
})

it('native call', function () {
	_eval(` console.log('111aaa') `)
})

it("while", function () {
	test(`
		var _global_a = 0
		while(true) {
			_global_a += 1

			if (_global_a < 100) {
				continue
			} 
			break
		}

		_global_a
	`)
});

it('new/this', function () {
	let myCar = _eval(`
		let Car = function(make, model, year) {
			this.make = make
			this.model = model
			this.year = year
		}

		//Car.prototype.getYear = function() {
  //			return this.year
		//}

		let myCar = new Car('Ford', 'Mustang', '1969')
		myCar
	`)
	assert.equal(myCar['make'], 'Ford')
	assert.equal(myCar['model'], 'Mustang')
	assert.equal(myCar['year'], '1969')
})

it('AssignmentExpression', function () {
	test(`let a = 1; a = 'abc1'`)
})

it('WhileStatement', function () {
	test(`let a = 3, b=10; while(a>=0){b+=a; a--; b}`)
})

it('ifStatement', function () {
	test(`if(true){let a=1, b=4; a+b}`)
})

it('ExpressionStatement', function () {
	test(`1+2`)
})

