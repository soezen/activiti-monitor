var bpmnViewer;
var baseUrl = 'http://localhost:8080/activiti-rest-ethab/service/';
var processDefinitions = {};
var processInstanceActivities = {};

function openProcessForm() {
	toggle('#process_form .content');
	toggle('#process_form .summary');
	toggle('#process_diagram');
	toggle('#process_info');
	bpmnViewer.clear();
}

function loadProcessDefinitions() {
	makeRestCall(baseUrl + 'repository/process-definitions?latest=true', handleProcessDefinitions)
}

function handleProcessDefinitions(d) {
	// TODO handle pagination or disable it
	if (d.data.length == 0) {
		setStatus('Currently no processes deployed.');
	}
	
	var select = $('#process_definition_key');
	d.data.forEach(function(processDefinition) {
		processDefinitions[processDefinition.key] = processDefinition;
		var option = $(document.createElement('option'));
		option.val(processDefinition.key);
		option.text(processDefinition.name);
		select.append(option);
	});
}

function loadProcess() {
	hide('#process_form .status');
	var key = $('#process_definition_key').val();
	var applicationId = $('#application_id').val();
	var finished = $('input[type=radio][name=state]:checked').val();
	console.log(key + ' - ' + applicationId + ' - ' + finished);

	$('#process_definition_key_value').text(key);
	$('#application_id_value').text(applicationId);
	$('#state_value').text(finished === 'true' ? 'finished' : 'active');
	loadProcessInstanceActivities(key, applicationId, finished, function() {
		hide('#process_form .content');
		show('#process_form .summary');
		show('#process_diagram');
		show('#process_info');
		loadProcessDiagram(key);
	});
	
	event.preventDefault();
	return false;
}

function toggle(selector) {
	$(selector).toggle();
}

function show(selector) {
	$(selector).show();
}

function hide(selector) {
	$(selector).hide();
}

function setStatus(message) {
	show('#process_form .status');
	show('#process_form .content');
	hide('#process_form .summary');
	$('#status').text(message);
}

function clearStatus() {
	toggle('#process_form .content');
	toggle('#process_form .status');
	$('#status').text('');
}

function loadProcessInstanceActivities(key, applicationId, finished, callback) {
	var data = {
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify({
			processDefinitionKey: key,
			finished: finished,
			variables: [{
				name: 'applicationId',
				value: new Number(applicationId),
				operation: 'equals',
				type: 'long'
			}]
		})
	};
	makeRestCall(
		baseUrl + 'query/historic-process-instances',
		function(e) {
			if (e.data.length == 1) {
				var processInstanceId = e.data[0].id;
				processInstanceActivities[key] = e.data[0];
				makeRestCall(baseUrl + 'history/historic-activity-instances?processInstanceId=' + processInstanceId,
					function(e) {
						handleProcessInstanceActivities(e);
						callback();
					});
			} else if (e.data.length == 0) {
				setStatus('No process found with given criteria');
			} else {
				setStatus('More than 1 process found with given criteria');
			}
		},
		data);
}

function loadProcessDiagram(key) {
	makeRestCall(
		baseUrl + 'repository/process-definitions?latest=true&key=' + key,
		handleProcessDefinition);
	
}

function handleProcessDefinition(d) {
	var processDefinition = d.data[0];
	var bpmnUrl = processDefinition.resource.replace('/resources/', '/resourcedata/');
	makeRestCall(bpmnUrl, handleProcessDefinitionDiagram);
}

function handleProcessDefinitionDiagram(bpmn) {

	bpmnViewer.importXML(bpmn, 
		function(err) {
			if (err) return console.error('could not import BPMN 2.0 diagram', err);
			bpmnViewer.get('eventBus').fire('diagram.loaded');
		});
	
}

function loadProperties(e) {
	var element = e.element.businessObject;
	console.log(element);
	var type = element.$type.replace('bpmn:', '');
	$('#activity_type').text(type);
	$('#activity_name').text(element.name ? element.name : '');
	if (element.activity) {
		var activity = element.activity;
		$('#activity_start').text(activity.startTime ? activity.startTime : '');
		$('#activity_end').text(activity.endTime ? activity.endTime : '');
	}
}

function loadSubProcess(e) {
	if (e.element.type === 'bpmn:CallActivity') {
		var calledElement = e.element.businessObject.calledElement;
		var processDefinition = processDefinitions[calledElement];
		if (!processDefinition) {
			setStatus('No process deployed with key ' + calledElement);
			return;
		}
		$('#process_definition_key').val(calledElement);
		$('#process_definition_key_value').text(calledElement);
		loadProcess();
	}
}

function handleProcessInstanceActivities(d) {
	for (var i in d.data) {
		var activity = d.data[i];
		processInstanceActivities[activity.activityId] = activity;
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

function addProperties(e) {
	var businessObject = e.element.businessObject;
	var activity = processInstanceActivities[businessObject.id];
	businessObject.activity = activity;

	var canvas = bpmnViewer.get('canvas');
	if (activity && activity.startTime && activity.endTime) {
		canvas.addMarker(e.element.id, 'finished');
	} else if (activity && activity.startTime) {
		canvas.addMarker(e.element.id, 'running');
	}
}

function resetProperties() {
	processInstanceActivities = {};
}

$(document).ready(function() {
	$('#process_form').on('submit', loadProcess);
	
	function PropertiesModule(eventBus) {
		eventBus.on('diagram.destroy', resetProperties);
		eventBus.on('element.click', loadProperties);
		eventBus.on('element.dblclick', loadSubProcess);
		eventBus.on('root.added', addProperties);
		eventBus.on('root.added', loadProperties);
		eventBus.on('bpmnElement.added', addProperties);
	}
	
	function ZoomModule(canvas, eventBus) {
		eventBus.on('diagram.loaded', function() {
			var height = canvas.viewbox().inner.height;
			var y = canvas.viewbox().inner.y;
			$('#process_diagram svg').attr('height', height + y);
		});
	}
	
	PropertiesModule.$inject = ['eventBus'];
	ZoomModule.$inject = ['canvas', 'eventBus'];

	var extensionModule = {
			__init__: ['properties', 'zoom'],
			properties: ['type', PropertiesModule],
			zoom: ['type', ZoomModule]
	};
	
	bpmnViewer = new window.BpmnJS({
		container : '#process_diagram',
		additionalModules: [ extensionModule]
	});
});
