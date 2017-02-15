
var gui = (function() {
	
	function showOverlay(selector, msg) {
		console.debug('show overlay on ' + selector);
		var element = $(selector);
		var overlay = $('<div class="overlay"><div class="icon"><i class="fa fa-cog fa-spin fa-3x"></i></div><div class="text">' + msg + '</div></div>');
		if (selector !== 'body') {
			element.css('position', 'relative');
		}
		
		element.append(overlay);
		overlay.css('border-radius', element.css('border-radius'));
	}
	
	function hideOverlay(data, params) {
		var selector = params.selector;
		console.debug('hide overlay on ' + selector);
		var element = $(selector);
		element.find('div.overlay').remove();
	}
	
	function addProcessDefinition(procDef) {
		console.debug('add option for ' + procDef.key);
		var select = $('#process_definition_key');
		var option = $(document.createElement('option'));
		option.val(procDef.key);
		option.text(procDef.name);
		select.append(option);
	}
	
	function getFormData() {
		var key = $('#process_definition_key').val();
		// TODO generate form variables based on process definition given
		var applicationId = $('#application_id').val();
		var finished = $('input[type=radio][name=state]:checked').val();
		return {
			processDefinitionKey: key,
			finished: finished,
			variables: [{
				name: 'applicationId',
				type: 'long',
				operation: 'equals',
				value: new Number(applicationId)
			}]
		};
	}
	
	function showError(message, params) {
		message = params ? params.message : message;
		$('#process_form .status').show();
		$('#status').text(message);
		$('div.overlay').remove();
	}
	
	function clearError() {
		$('#process_form .status').hide();
	}
	
	function getProperties(element) {
		
		var contentProperties = $(document.createElement('div'));
		contentProperties.addClass('properties');
		var type = $(document.createElement('span'));
		type.text(element.type.replace('bpmn:', ''));
		contentProperties.append(type);
		
		if (element.activity) {
			var activity = element.activity;
			var startTime = $(document.createElement('span'));
			startTime.text(formatTime(element.activity.startTime));
			contentProperties.append(startTime);
			var endTime = $(document.createElement('span'));
			endTime.text(formatTime(element.activity.endTime));
			contentProperties.append(endTime);
		}
		return contentProperties.html();
	}
	
	function showActivity(activity) {
		var diagramViewer = $('.diagram.active').data('bpmn');
		diagramViewer.addActivity(activity);
	}
	
	function loadActivities() {
		var diagramViewer = $('.diagram.active').data('bpmn');
		diagramViewer.loadActivities();
	}
	
	function showVariable(variable) {
		var div = $('.diagram.active .variables ul');
		var li = $(document.createElement('li'));
		div.append(li);
		
		var spanName = $(document.createElement('span'));
		spanName.addClass('variable-name');
		spanName.text(variable.variable.name);
		li.append(spanName);
		
		if (variable.variable.type === 'string' && variable.variable.value.indexOf('<?xml') == 0) {
			var xmlButton = $(document.createElement('i'));
			xmlButton.addClass('fa fa-search');
			li.append(xmlButton);
		} else {
			var spanValue = $(document.createElement('span'));
			spanValue.addClass('variable-value');
			spanValue.text(variable.variable.value);
			li.append(spanValue);	
		}
	}
	
	function showProcessInstance(instance, definition) {
		clearError();
		if (!definition.processDefinition) {
			showError ('Process definition not found');
			return;
		}
		if (!definition.diagram) {
			showError('No process diagram available for ' + definition.processDefinition.key);
			return;
		}
		var diagramsContainer = $('#diagrams');
		
		// append new active div (new diagram)
		var bpmn = definition.diagram.bpmn;
		var processDefinition = definition.processDefinition;
		if (diagramsContainer.find('.diagram').length == 0) {
			// summary search form
			$('#process_name').text(processDefinition.name);
			$('#process_variables').text('[applicationId=' + $('#application_id').val() + ']');
			$('#process_form .content').hide();
			$('#process_form .summary').show();
		}

		$('.diagram.active').removeClass('.active');

		var div = $(document.createElement('div'));
		div.addClass('diagram');
		div.addClass('active');
		var header = $(document.createElement('div'));
		header.addClass('header');
		var startTime = $(document.createElement('span'));
		startTime.text(formatTime(instance.startTime));
		header.append(startTime);
		var processId = $(document.createElement('span'));
		processId.text(instance.processDefinitionId);
		header.append(processId);
		var endTime = $(document.createElement('span'));
		endTime.text(formatTime(instance.endTime));
		header.append(endTime);
		div.append(header);
		
		var variables = $(document.createElement('div'));
		variables.addClass('variables');
		var variablesList = $(document.createElement('ul'));
		variables.append(variablesList);
		div.append(variables);
		
		var content = $(document.createElement('div'));
		content.addClass('content');
		div.append(content);
		$('#diagrams').append(div);
		
		var diagramViewer = new DiagramViewer(content);
		div.data('bpmn', diagramViewer);
		diagramViewer.load(bpmn);
	}
	
	function formatPeriod(startTime, endTime) {
		return '[' + formatTime(startTime) + ', ' + formatTime(endTime) + ']';
	}
	
	function formatTime(time) {
		if (!time) {
			return '';
		}
		var date = new Date(time);
		return padWithZero(date.getDate(), 2) + '-' + padWithZero(date.getMonth() + 1, 2) + '-' + date.getFullYear()
		 + ' ' + padWithZero(date.getHours(), 2) + ':' + padWithZero(date.getMinutes(), 2) + ':' + padWithZero(date.getSeconds(), 2);
	}
	
	function padWithZero(value, length) {
		return (Array(length).join("0") + value).slice(-length);
	}
	
	return {
		showOverlay: showOverlay,
		hideOverlay: hideOverlay,
		addProcessDefinition: addProcessDefinition,
		getFormData: getFormData,
		showProcessInstance: showProcessInstance,
		showError: showError,
		getProperties: getProperties,
		showActivity: showActivity,
		loadActivities: loadActivities,
		showVariable: showVariable,
		formatTime: formatTime
	}
})();