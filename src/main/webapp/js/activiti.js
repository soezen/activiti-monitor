var activiti = (function() {
	// TODO support multiple deployments of same process 
	var diagrams = new Cache();
	var deployments = new Cache();
	var processInstanceId;
	
	function register(app) {
		listeners.on('end.fetch.deployments', gui.hideOverlay, {selector: '#process_form'});
		listeners.on('diagram.shown', gui.hideOverlay, {selector: 'body'});
		listeners.on('deployment.loaded', gui.addProcessDefinition).forEachItemIn(app).when(processIsSame);
		listeners.on('deployment.loaded', client.fetchDeploymentDiagram);
		listeners.on('deployment.loaded', deployments.put, {key: function(event) { return event.data.id; }});
		listeners.on('diagram.loaded', diagrams.put, {key: function(event) { return event.data.processDefinitionId; }});
		listeners.on('process_instance.loaded', gui.showProcessInstance, {
			processDefinition: function(event) {
				return deployments.get(event.data.processDefinitionId); 
			},
			diagram: function(event) {
				return diagrams.get(event.data.processDefinitionId);
			}});
		listeners.on('process_instance.loaded', setProcessInstanceId);
		listeners.on('process_instance.loaded', client.fetchActivityInstances);
		listeners.on('process_instance.loaded', client.fetchProcessInstanceVariables);
		listeners.on('process_instance.not_found', gui.showError, { message: 'No process found for given criteria.' });
		listeners.on('activity.loaded', gui.showActivity);
		listeners.on('variable.loaded', gui.showVariable);
		listeners.on('end.fetch.activities', gui.loadActivities);
	}
		
	function processIsSame(event, item) {
		return event.data.key === item.key;
	}
		
	function init() {
		console.debug('Initializing activiti monitor form');
		gui.showOverlay('#process_form', 'initializing');
		client.fetchDeployments();
	}
	
	function search() {
		gui.showOverlay('body', 'searching');
		var formData = gui.getFormData();
		client.fetchProcessInstance(formData);
	}
	
	function setProcessInstanceId(processInstance) {
		processInstanceId = processInstance.id;
	}
	
	function loadSubProcess(key) {
		var formData = {
			processDefinitionKey: key,
			superProcessInstanceId: processInstanceId
		}
		client.fetchProcessInstance(formData);
	}
	
	
	function Process(key) {
		return {
			key: key
		};
	}
	
	return {
		init: init,
		register: register,
		search: search,
		loadSubProcess: loadSubProcess,
		Process: Process
	};
})();
