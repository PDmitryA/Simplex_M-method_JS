
$(document).on('click', '.js-add', function (e) {
	e.preventDefault();
	e.stopPropagation();
	const self = $(this);
	const form = self.closest('.js-get-data');
	const x = form.find('[name="x"]').val() || 0;
	const y = form.find('[name="y"]').val() || 0;
	const pointsContainer = form.closest('.js-points');
	pointsContainer.html(pointsContainer.html() + `
		
				<div class="table__row js-point">
					<div class="table__cell js-x text">${x}</div>
					<div class="table__cell js-y text">${y}</div>
					<div class="table__cell">
						<button class="button js-del text">Del</button>
					</div>
				</div>
	`);
	
	$('.js-solution').hide();
});

$(document).on('click', '.js-del', function(e) {
	$(this).closest('.js-point').remove();
	$('.js-solution').hide();
});

function getConditionsForPoint({x, y}) {
	return [{
		expr: [1, x, -x, 1, -1],
		type: ConditionTypes.gte,
		value: y,
	},
	{
		expr: [-1, x, -x, 1, -1],
		type: ConditionTypes.lte,
		value: y,
	}]
}

$(document).on('click', '.js-solve', function(e) {
	e.preventDefault();
	const $points = $('.js-point');
	const points = [].map.call($points, point => {
		return {x: +$(point).find('.js-x').text(), y: +$(point).find('.js-y').text()}
	});
	
	const conditions = [];
	points.forEach(point => {
		conditions.push(...getConditionsForPoint(point));
	});
	
	const simplex = new Simplex({
	  L: [1, 0, 0],
	  conditions: conditions,
	  taskType: TaskTypes.minimization,
	});

	const result = simplex.solve();
	
	const {0: eps = 0, 1: a1 = 0, 2: a2 = 0, 3: b1 = 0, 4: b2 = 0} = result;
	const a = a1 - a2;
	const b = b1 - b2;
	
	const draw = document.getElementById('js-draw');
	
	const maxX = Math.max(...points.map(point => point.x));
	
	shapes = [{
		type: 'line',
		x0: 0,
		y0: b,
		x1: maxX,
		y1: maxX * a + b,
		line: {
			color: 'rgb(255, 128, 191)',
			width: 3
		}
	}];
	Plotly.newPlot(draw, [{
		x: points.map(point => point.x),
		y: points.map(point => point.y),
		mode: 'markers',
		marker: { size: 12 }
	}], {
		margin: { t: 60 },
		shapes: shapes
	});
	$('.js-A').text(a.toFixed(5));
	$('.js-B').text(b.toFixed(5));
	$('.js-E').text(eps.toFixed(5));
	$('.js-solution').show();
});

