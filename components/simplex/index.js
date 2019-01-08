const machine_err = 1e-14;

const TaskTypes = {
  minimization: 'minimization',
  maximization: 'maximization',
};

const ConditionTypes = {
  gte: 'gte',
  lte: 'lte',
  eq: 'eq',
};

class Simplex {

  constructor({
    L = [],
    conditions = [],
    taskType = TaskTypes.minimization,
  } = {}) {
    if (!L.length) {
      throw Error('You must specify at least 1 argument of L');
    }
    if (!conditions.length) {
      throw Error('You must specify at least 1 argument of conditions');
    }

    this.L = L;
    this.conditions = conditions;
    this.xCount = Math.max(...conditions.map(cond => cond.expr.length));
    this.basis = [];
    this.addCount = 0;
    this.taskType = taskType;
    this.toMinimization();
    this.toCanon();

    this.M = [];
    this.lValue = 0;
    this.mValue = 0;

    return this;
  }

  printAll() {
    console.log("L: ", this.L);
    console.log("conditions: ", this.conditions);
    console.log("xCount: ", this.xCount);
    console.log("basis: ", this.basis);
    console.log("addCount: ", this.addCount);
    console.log("taskType: ", this.taskType);
    console.log("M: ", this.M);
  }

  toMinimization() {
    if (this.taskType === TaskTypes.maximization) {
      this.L = this.L.map(item => (- item));
      this.taskType = TaskTypes.minimization;
    }
    return this;
  }

  toCanon() {
    this.conditions.forEach(cond => {
      let canonicalCoef;
      switch (cond.type) {
        case ConditionTypes.eq:
          return;
        case ConditionTypes.gte:
          canonicalCoef = -1;
          break;
        case ConditionTypes.lte:
          canonicalCoef = 1;
          break;
        default:
          throw Error('You need to specify type of condition');
      }
      this.addCount++;
      cond.type = ConditionTypes.eq;
      cond.expr[this.addCount + this.xCount - 1] = canonicalCoef;
    })
  }

  initBasis() {
    let inBasisShouldCount = this.conditions.length;
    this.basis = [];
    if(inBasisShouldCount) {
      this.conditions.forEach(cond => {
        if (inBasisShouldCount) {
          const found = cond.expr.slice(this.xCount).find((x, i) => {
            if (x === 1) {
              this.basis.push(i + this.xCount);
              inBasisShouldCount--;
              return true;
            }
            return false;
          });
          if (!found) {
            this.addCount++;
            const xIndex = this.addCount + this.xCount - 1;
            cond.expr[xIndex] = 1;
            this.basis.push(xIndex);
            this.M[xIndex] = 1;
            inBasisShouldCount--;
          }
        }
      })
    }
  }

  findNextBasisItem() {
    let minIndex = null;
    const mLength = this.M.length - this.xCount;
    for (let i = 0; i < mLength; i++) {
      if ((this.M[i] + machine_err) < 0 && (minIndex == null || this.M[i] < this.M[minIndex])) {
        minIndex = i;
      }
    }
    if (minIndex != null) {
      return minIndex;
    }
    const lLength = this.L.length - this.xCount;
    for (let i = 0; i < lLength; i++) {
      if ((this.L[i] + machine_err) < 0 && (minIndex == null || this.L[i] < this.L[minIndex])) {
        minIndex = i;
      }
    }
    return minIndex;
  }

  findLeadingRow(index) {
    const {minIndex} = this.conditions.reduce((prev, {expr, value}, i) => {
      if ((expr[index] - machine_err) > 0 && (prev.min == null || (value / expr[index]) < prev.min)) {
        prev.min = value / expr[index];
        prev.minIndex = i;
      }
      return prev;
    }, {min: null, minIndex: null});

    return minIndex;
  }

  multiplyVector(vector, multiplier) {
    return vector.map(item => ((item || 0) * multiplier));
  }

  plusVector(original, plus) {
    plus.forEach((item, i) => {
      original[i] = (original[i] || 0) + (item || 0);
    });
  }

  kickM() {
    this.basis.filter(basisItem => this.M[basisItem] !== 0).forEach(basisItemIndex => {
      if (this.M[basisItemIndex] === 0) {
        return;
      }
      const [condition, ] = this.conditions
        .filter(({expr}) => expr[basisItemIndex]);
      const multiplier = - (this.M[basisItemIndex] / condition.expr[basisItemIndex]);
      const multiplied = this.multiplyVector(condition.expr, multiplier);
      this.plusVector(this.M, multiplied);
      this.mValue += condition.value * multiplier;
    })
  }

  swapBasis(leadingRow, leadingCol) {
    this.conditions.map((cond, i) => {
      if (i === leadingRow) {
        const multiplier = 1 / cond.expr[leadingCol];
        cond.expr = this.multiplyVector(cond.expr, multiplier);
        cond.value = cond.value * multiplier;
      } else {
        const multiplier = - cond.expr[leadingCol] / this.conditions[leadingRow].expr[leadingCol];
        this.plusVector(cond.expr, this.multiplyVector(this.conditions[leadingRow].expr, multiplier));
        cond.value += this.conditions[leadingRow].value * multiplier;
      }
    });

    const multiplierM = - (this.M[leadingCol] || 0) / this.conditions[leadingRow].expr[leadingCol];
    this.plusVector(this.M, this.multiplyVector(this.conditions[leadingRow].expr, multiplierM));
    this.mValue = (this.mValue || 0) + this.conditions[leadingRow].value * multiplierM;

    const multiplierL = - (this.L[leadingCol] || 0) / this.conditions[leadingRow].expr[leadingCol];
    this.plusVector(this.L, this.multiplyVector(this.conditions[leadingRow].expr, multiplierL));
    this.lValue = (this.lValue || 0) + this.conditions[leadingRow].value * multiplierL;

    this.basis[leadingRow] = leadingCol;
  }
  
  getValues() {
	const result = {};
	this.basis.forEach((x, i) => {
		result[x] = this.conditions[i].value;
	});
	return result;
  }

  solve() {
    this.initBasis();
    this.kickM();
    this.printAll();
    while (true) {
      const nextBasisItem = this.findNextBasisItem();
      console.log("next basis item: ", nextBasisItem);
      if (nextBasisItem != null) {
        const leadingRow = this.findLeadingRow(nextBasisItem);
        console.log("leading row: ", leadingRow);
        this.swapBasis(leadingRow, nextBasisItem);
		console.log('_______________________________________');
		this.printAll();
      } else {
        break;
      }
    }
	return this.getValues();
  }
}
