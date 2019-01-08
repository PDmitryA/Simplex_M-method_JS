# Simplex M-method | The method of artificial basis | JS
Implemented simplex M-method is used as an application to the approximation task.

The core is `components/simplex/index.js`.

# How to use Simplex core?

Example:
```js
const simplex = Simplex({
  L: [1, 0, 0],                      // the criterion function coefficients
  conditions: [
    {
      expr: [1, 1, -3],              // the limiting condition coefficients
      value: 9,                      // the limiting condition value
      type: ConditionTypes.lte       // the limiting condition type
    },
    {
      expr: [2, -5, 0],
      value: 9,
      type: ConditionTypes.gte
    },
  ],
  taskType: TaskTypes.minimization,  // task type (also can be TaskTypes.maximization)
});

const result = simplex.solve();      // array of values of basis variables
```

# What is the task it is applied for in this project?

The task it is applied for is `x-y` points which are need to be approximated by line.
This line must be the closest one to `y`-values of points minimizing absolute approximation error.

# Technologies & Libs & Thanks 

ES6, JQuery, Plotly
