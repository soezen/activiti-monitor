// framework.js
// load processes (with diagrams)
// generate gui based on definitions from ethab.js
// on form submit, load process instance data (incl. activities) and show diagram with process instance data
// allow user to navigate to subProcess, then load processInstance via id (instead of params)

// ethab.js
// definition of process with query params (using objects from framework.js)
// trigger generation of gui

// FRAMEWORK (reusable)


var activiti = (function() {
	var bpmnViewer = initBpmnViewer();
	var restClient = initRestClient();
	var processDefinitions;
	
	function Process(key, variables) {
		return {
			key: key
		};
	}
	
	function init(app) {
		gui.showOverlay('#process_form');
		processDefinitions = initProcessDefinitions(app);
		populateProcessDropdown();
		gui.hideOverlay('#process_form');
	}
	
	function populateProcessDropdown() {
		var select = $('#process_definition_key');
		processDefinitions.list().forEach(function(d) {
			var procDef = processDefinitions.get(d.key);
			var option = $(document.createElement('option'));
			option.val(procDef.key);
			option.text(procDef.name);
			select.append(option);
		});
	}
	
	function initProcessDefinitions(app) {
		var deployed = {};
		var loaded = false;
		initDeployedProcessDefinitions();
		
		function get(key) {
			return deployed[key];
		}
		
		function list() {
			var procDefs = [];
			for (var i in app) {
				procDefs.push(app[i]);
			}
			return procDefs;
		}
		
		function set(processDefinition) {
			deployed[processDefinition.key] = processDefinition;
		}
		
		function initDeployedProcessDefinitions() {
			restClient.fetchProcessDefinitions(function(e) {
				e.data.forEach(set);
			});
		}
		
		return {
			get: get,
			list: list
		};
	}
	
	function initBpmnViewer() {
		var bpmnViewer = null;
		function get() {
			if (bpmnViewer == null) {
				bpmnViewer = new window.BpmnJS({
					container : '#process_diagram'
				});
			}
			return bpmnViewer;
		}
		return {
			get: get
		}
	}
	
	function initRestClient() {
		var baseUrl = 'http://localhost:8080/activiti-rest-ethab/service/';
		
		function fetchProcessDefinitions(handler) {
			makeRestCall(baseUrl + 'repository/process-definitions?latest=true', handler);
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
			fetchProcessDefinitions: fetchProcessDefinitions
		};
	}
	
	function register(app) {
		processDefinitions = initProcessDefinitions(app);
	}
	
	return {
		init: init,
		Process: Process
		
	};
})();

//ETHAB specific code
var ethab = (function() {
	var processDefinitions = (function() {
		var applicationProcess = new activiti.Process('applicationProcess', {
			applicationId: {
				name: 'applicationId',
				type: 'long'
			}
		});
		
		return {
	        applicationProcess: applicationProcess
		};
	})();
	
	return processDefinitions;
})();
activiti.init(ethab);


// 1. define which process to be added to form
// 2. init form
// 2.1 put overlay on
// 2.2 register a process loaded listener for each of them
// 2.3 register a fetch finished listener to remove overlay
// 2.4 fetch all deployed process
// 3. 







