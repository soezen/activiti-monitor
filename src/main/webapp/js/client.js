var client = (function() {
	var baseUrl = 'http://localhost:8080/activiti-rest-ethab/service/';
	
	function fetchDeployments() {
		listeners.notify('start.fetch.deployments');
		makeRestCall(baseUrl + 'repository/process-definitions?latest=true', 
				new RestCallReturnsListHandler('deployment.loaded', 'end.fetch.deployments'));
	}
	
	function fetchDeploymentDiagram(processDefinition) {
		var bpmnUrl = processDefinition.resource.replace('/resources/', '/resourcedata/');
		makeRestCall(bpmnUrl, new RestCallReturnsBpmn(processDefinition.id, 'diagram.loaded'));
	}
	
	function fetchProcessInstance(criteria) {
		listeners.notify('start.fetch.process_instance');
		makeRestCall(baseUrl + 'query/historic-process-instances', 
				new RestCallReturnsSingleItemHandler('process_instance'),
				{type: 'POST', contentType: 'application/json', data: JSON.stringify(criteria)});
	}
	
	function fetchProcessInstanceVariables(processInstance) {
		listeners.notify('start.fetch.variables');
		makeRestCall(baseUrl + 'history/historic-variable-instances?processInstanceId=' + processInstance.id,
				new RestCallReturnsListHandler('variable.loaded', 'end.fetch.variables'));
	}
	
	function fetchActivityInstances(processInstance) {
		listeners.notify('start.fetch.activity_instances');
		makeRestCall(baseUrl + 'history/historic-activity-instances?size=100&processInstanceId=' + processInstance.id,
				new RestCallReturnsListHandler('activity.loaded', 'end.fetch.activities'));
	}
	
	function RestCallReturnsListHandler(itemEventType, endEventType) {
		return function(data) {
			data.data.forEach(function(d) {
				listeners.notify(itemEventType, d);
			});
			listeners.notify(endEventType);
		}
	}
	
	function RestCallReturnsSingleItemHandler(eventType) {
		return function(data) {
			if (data.data.length == 0) {
				listeners.notify(eventType + '.not_found');
			} else if (data.data.length > 1) {
				listeners.notify(eventType + '.too_many_results');
			} else {
				listeners.notify(eventType + '.loaded', data.data[0]);
			}
			listeners.notify('end.fetch.' + eventType);
		}
	}
	
	function RestCallReturnsBpmn(key, eventType) {
		return function(data) {
			listeners.notify(eventType, { bpmn: data, processDefinitionId: key});
		}
		
	}
	
	function makeRestCall(url, handler, options) {
		var username = 'sur';
		var password = 'test123';

		$.ajax({
			type : options && options.type ? options.type : 'GET',
			contentType : options && options.contentType ? options.contentType : null,
			data : options ? options.data : null,
			url : url,
			error : handleError,
			beforeSend : addAuthorizationToHeader
		}).done(handler);

		function addAuthorizationToHeader(xhr) {
			xhr.setRequestHeader("Authorization", "Basic "
					+ btoa(username + ':' + password));
		}

		function handleError(err) {
			console.log(err);
		}
	}
	
	return {
		fetchDeployments: fetchDeployments,
		fetchDeploymentDiagram: fetchDeploymentDiagram,
		fetchProcessInstance: fetchProcessInstance,
		fetchProcessInstanceVariables: fetchProcessInstanceVariables,
		fetchActivityInstances: fetchActivityInstances
	}
})();