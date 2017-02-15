var ethab = (function() {
	var processes = [
			new activiti.Process('applicationProcess'),
			new activiti.Process('applicationSubProcess')
	];

	return processes;
})();

activiti.register(ethab);