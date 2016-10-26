var ethab = (function() {
	var processes = [
			new activiti.Process('applicationProcess')
	];

	return processes;
})();

activiti.register(ethab);