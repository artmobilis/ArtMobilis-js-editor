angular.module('app')

.controller('JourneyEditorCtrl', [
  '$scope',
  '$timeout',
  'DataManagerSvc',
  'journeyType',
  'ProjectsManagerSvc',
  function($scope,
    $timeout,
    DataManagerSvc,
    journeyType,
    ProjectsManagerSvc) {

  var _selection = {
    model: 'journey',
    type: null,
    id: null,
    elem: null
  };

  $scope.edit_mode = '';
  $scope.GetJourney = null;

  $scope.selection = _selection;

  $scope.drag = {
    type: null,
    id: null
  }

  $scope.state = {
    active: false
  }

  $scope.debug = {
    state: false
  }

  function OnChannelUpdated() {
    $timeout(function() {
      var type = _selection.type;
      var id = _selection.id;
      ResetSelection();
      $timeout(function() {
        SetSelection(type, id);
      });
    })
  }

  function ResetSelection() {
    _selection.model = 'journey';
    OnAssetSelectionChange();
  }

  function GetJourney() {
    return DataManagerSvc.GetData();
  }

  function SetJourney() {
    var journey_data = DataManagerSvc.GetData();
    $scope.journey   = journey_data.journey;
    $scope.pois      = journey_data.pois;
    $scope.channels  = journey_data.channels;
    $scope.markers   = journey_data.markers;
    $scope.objects   = journey_data.objects;
  }

  function SliceAssetId(data) {
    var sep_index = data.search('_');
    var type = (sep_index >= 0) ? data.slice(0, sep_index)  : data;
    var id   = (sep_index >= 0) ? data.slice(sep_index + 1) : null;
    return {
      type: type,
      id: id
    };
  }

  function OnAssetSelectionChange() {
    var journey_data = DataManagerSvc.GetData();
    var model = _selection.model;

    var slice = SliceAssetId(model);
    if (slice.type === 'journey') {
      _selection.elem = journey_data.journey;
    }
    else {
      _selection.elem = journey_data[slice.type][slice.id];
    }

    _selection.type = slice.type;
    _selection.id   = slice.id;
  }

  function AllowDrop(event) {
    event.preventDefault();
  }

  function DragAsset(type, id) {
    return function(event) {
      event.dataTransfer.setData('Text', type + '_' + id);
    }
  }

  function DropToChannel(channel, type, id) {
    if (type === 'markers') {
      if (channel.marker !== id) {
        channel.marker = id;
        DataManagerSvc.NotifyChange('channels', channel.uuid);
        $timeout();
      }
    }
    else if (type === 'objects') {
      var object = DataManagerSvc.GetData().objects[id];
      if (object) {
        channel.AddContent(new journeyType.ObjectTransform(id, object.name));
        DataManagerSvc.NotifyChange('channels', channel.uuid);
        $timeout();
      }
    }
    else
      return;

    OnChannelUpdated();
  }

  function DropToJourney(journey, type, id) {
    if (type === 'pois') {
      if (journey.AddPoi(id)) {
        DataManagerSvc.NotifyChange('journey');
        $timeout();
      }
    }
  }

  function DropToPoi(poi, type, id) {
    if (type === 'channels') {
      if (poi.AddChannel(new journeyType.PoiChannel(id)))
        DataManagerSvc.NotifyChange('pois', poi.uuid);
    }
    else if (type === 'objects') {
      var object = DataManagerSvc.GetData().objects[id];
      if (object) {
        if (poi.AddObject(new journeyType.ObjectTransform(id, object.name)))
          DataManagerSvc.NotifyChange('pois', poi.uuid);
      }
    }
  }

  var drop_fctns = {
    journey: DropToJourney,
    pois: DropToPoi,
    channels: DropToChannel
  };

  function Drop(event) {
    event.preventDefault();
    var data = event.dataTransfer.getData('Text');
    var slice = SliceAssetId(data);

    var fun = drop_fctns[_selection.type];
    if (typeof fun !== 'undefined') {
      fun(_selection.elem, slice.type, slice.id);
    }
  }

  function NewPoi() {
    var elem = new journeyType.Poi();
    elem.name = 'unnamed poi';
    DataManagerSvc.GetData().pois[elem.uuid] = elem;
  }

  function NewChannel() {
    var elem = new journeyType.Channel();
    elem.name = 'unnamed channel';
    DataManagerSvc.GetData().channels[elem.uuid] = elem;
  }

  function NewMarker() {
    var elem = new journeyType.Marker();
    DataManagerSvc.GetData().markers[elem.uuid] = elem;
  }

  function SetSelection(type, id) {
    _selection.model = type + '_' + id;
  }

  function Delete() {
    var data_jouney = DataManagerSvc.GetData();
    var container = data_jouney[_selection.type];

    var previous;
    var next;
    var found = false;
    for (id in container) {
      if (found) {
        next = id;
        break;
      }
      if (id === _selection.id) {
        found = true;
        continue;
      }
      previous = id;
    }
    if (found) {
      delete container[_selection.id];
      DataManagerSvc.NotifyChange(_selection.type, _selection.id);
      if (next)
        SetSelection(_selection.type, next);
      else if (previous)
        SetSelection(_selection.type, previous);
      else
        ResetSelection();

      DataManagerSvc.CleanReferences();
    }
  }

  function DetachFromPoi(poi, type, id) {
    if (type === 'poi-channel')
      poi.channels.splice(id, 1);
    else if (type === 'poi-channel-object')
      delete poi.channels[id].object;
    else if (type === 'poi-object')
      poi.objects.splice(id, 1);
    else
      return;

    DataManagerSvc.NotifyChange('pois', poi.uuid);
  }

  function DetachFromChannel(channel, type, id) {
    if (type === 'channel-content') {
      channel.contents.splice(id, 1);
      DataManagerSvc.NotifyChange('channels', channel.uuid);
    }
    else if (type === 'channel-marker') {
      channel.marker = null;
      DataManagerSvc.NotifyChange('channels', channel.uuid);
    }
    else
      return;

    OnChannelUpdated();
  }

  function DetachFromJourney(journey, type, id) {
    if (type === 'journey-poi') {
      journey.pois.splice(id, 1);
      DataManagerSvc.NotifyChange('journey');
    }
  }

  var detach_fctns = {
    journey: DetachFromJourney,
    pois: DetachFromPoi,
    channels: DetachFromChannel
  }

  function Detach(event) {
    event.preventDefault();
    var data = event.dataTransfer.getData('Text');
    var slice = SliceAssetId(data);

    var fun = detach_fctns[_selection.type];
    if (fun)
      fun(_selection.elem, slice.type, slice.id);
    $timeout();
  }

  function OnDataChange(type, id) {
    if (typeof type !== 'undefined') {
      if (type === 'channel' && _selection.type === 'channels') {
        if (typeof id === 'undefined' || id === _selection.id)
          OnChannelUpdated();
      }
      else if (type === 'data_journey')
        ResetSelection();
    }
    else {
      ResetSelection();
    }
    SetJourney();
    $timeout();
  }

  function OnProjectChange() {
    $scope.state.active = !ProjectsManagerSvc.IsEmpty();
    $timeout();
  }

  function UpdatePoiPositions() {
    if (_selection.type === 'pois') {
      DataManagerSvc.NotifyChange('pois', _selection.id);
    }
  }

  DataManagerSvc.AddListenerDataChange(OnDataChange);

  ProjectsManagerSvc.AddListenerChange(OnProjectChange);
  OnProjectChange();

  ResetSelection();


  $scope.$watch('selection.model', function() {
    OnAssetSelectionChange();
  });
  

  $scope.GetJourney = GetJourney;
  $scope.DragAsset = DragAsset;
  $scope.Drop = Drop;
  $scope.NewPoi = NewPoi;
  $scope.NewChannel = NewChannel;
  $scope.NewMarker = NewMarker;
  $scope.Delete = Delete;
  $scope.Detach = Detach;
  $scope.UpdatePoiPositions = UpdatePoiPositions;

  $scope.$on('$destroy', function() {
    DataManagerSvc.RemoveListenerDataChange(OnDataChange);
    ProjectsManagerSvc.RemoveListenerChange(OnProjectChange);
  })

}])