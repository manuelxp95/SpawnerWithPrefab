// -----JS CODE-----
// Particle Spawner by Luka Lan Gabriel
// Version: 0.0.1
// Event: Initialized
// Description: Spawns objects specified on the scrip and animates them according to the settings

//@ui {"widget" : "group_start", "label" : "Objects"}
//@input int count {"widget" : "slider", "min" : "0", "max" : "500", "step" : "1", "label" : "Count"}
//@input float lifetime {"label" : "Lifetime"}
//@input int size {"widget" : "slider", "min" : "0", "max" : "200", "step" : "1", "label" : "Size [%]"}
//@input int sizeVariance {"widget" : "slider", "min" : "0", "max" : "100", "step" : "1", "label" : "Size Variance"}
//@ui {"widget" : "group_end"}

//@ui {"widget" : "group_start", "label" : "Spawn Box"}
//@input vec3 spawnBoxSize {"label" : "Size"}
//@input vec3 spawnBoxOffset {"label" : "Offset"}
//@ui {"widget" : "group_end"}

//@ui {"widget" : "group_start", "label" : "Movement"}
//@input bool move
//@input vec3 startSpeed {"showIf" : "move", "label" : "Speed"}
//@input int startSpeedVariance {"showIf" : "move", "widget" : "slider", "min" : "0", "max" : "100", "step" : "1", "label" : "Speed Variance"}
//@input vec3 worldForce {"showIf" : "move", "label" : "Force"}
//@input int worldForceVariance {"showIf" : "move", "widget" : "slider", "min" : "0", "max" : "100", "step" : "1", "label" : "Force Variance"}

//@input bool rotation
//@input bool rotationBothSides {"showIf" : "rotation", "label" : "Rotate Both Sides"}
//@input vec3 rotationVector {"showIf" : "rotation", "label" : "Rotate Objects"}
//@input vec3 rotationVectorVariance {"showIf" : "rotation", "label" : "Rotation Vector"}
//@input int rotationStrength {"showIf" : "rotation", "widget" : "slider", "min" : "0", "max" : "100", "step" : "1", "label":"    Rotation Strength"}
//@input int rotationStrengthVariance {"showIf" : "rotation", "widget" : "slider", "min" : "0", "max" : "100", "step" : "1", "label" : "Rotation Variance"}

//@input int inputMode {"widget" : "combobox", "values":[{"label" : "None", "value" : "0"}, {"label" : "Head", "value" : "1"}]}
//@input int manipulationStrengthFace {"showIf" : "inputMode", "showIfValue" : "1", "widget" : "slider", "min" : "0", "max" : "100", "step" : "1", "label" : "Manipulation Strength"}
//@ui {"widget" : "group_end"}

//@input int depthSplit {"widget" : "slider", "min" : "0", "max" : "100", "step" : "1", "label" : "Depth Split [%]"}

//@input bool advanced
//@input Component.Camera bgCamera {"showIf" : "advanced", "label" : "Background Camera"}
//@input Component.Camera fgCamera {"showIf" : "advanced", "label" : "Foreground Camera"}
//@input SceneObject headReference {"showIf" : "advanced", "label" : "Head Reference"}

var activeObjects;
var recycledObjects;

var spawnDeltaTime;
var spawnTime;

var thisSceneObject;
var originalObjects;
var objectToSpawnIndex;

var hiddenLayerSet;
var visibleLayerSet;

// Size
var size = script.size/100;
var sizeVariance = script.sizeVariance/100;

// Speed
var speed = script.startSpeed;
var force = script.worldForce;
var speedVariance = script.startSpeedVariance/100;
var forceVariance = script.worldForceVariance/100;

// Rotation
var rotationStrength = script.rotationStrength/25;
var rotationStrengthVariance = script.rotationStrengthVariance/100;

// Manipulation
var newSpeed = new vec3(0, 0, 0);

// Degrees to rotate by
var degrees = script.rotationVector;
var degreesVariance = script.rotationVectorVariance;

// Convert degrees to radians
var radians = degrees.uniformScale(Math.PI / 180);
var radiansVariance = degreesVariance.uniformScale(Math.PI / 180);

// Camera settings
var bgCamera = script.bgCamera.renderLayer;
var fgCamera = script.fgCamera.renderLayer;
var depthSplit = script.depthSplit/100;

var minZ = -0.5 * script.spawnBoxSize.z + script.spawnBoxOffset.z;
var maxZ = 0.5 * script.spawnBoxSize.z + script.spawnBoxOffset.z;
var diffZ = maxZ - minZ;
var diffPoint = maxZ - depthSplit * diffZ;

// Head reference
var headTransform = script.headReference.getTransform();

// Setup hint
if(script.inputMode == 1) {

    // Create the hints component
    var hintsComponent = script.getSceneObject().createComponent("Component.HintsComponent");

    // Show "Smile" hint
    hintsComponent.showHint("lens_hint_move_your_head", 4);
}

script.createEvent("TurnOnEvent").bind(onTurnOn);

function checkInitialized() {
    
    visibleLayerSet = script.fgCamera.renderLayer;
    hiddenLayerSet = visibleLayerSet.except(visibleLayerSet);
    
    thisSceneObject = script.getSceneObject();
    originalObjects = [];
    objectToSpawnIndex = 0;
    
    for(var i = 0; i < thisSceneObject.getChildrenCount(); i++) {
        var originalObject = thisSceneObject.getChild(i);
        if(originalObject.enabled) {
            originalObjects.push(originalObject);
            
            var children = getAllChildren(originalObject);
            switchRenderLayer(children, false);
        }
    }
    
    if(originalObjects.length <= 0) {
        print("Please add objects to spawn");
        return false;
    }
    
    if(script.count == 0) {
        print("Warning, spawn count is set to 0");
        return false;
    }
    
    if(size == 0) {
        print("Warning, spawn object size is set to 0");
        return false;
    }
    
    if(script.spawnBoxSize.x == 0 && script.spawnBoxSize.y == 0 && script.spawnBoxSize.z == 0) {
        print("Warning, spawn box size is set to 0");
        return false;
    }
    
    return true;
}

function onTurnOn() {
    
    var initialized = checkInitialized();
    if(!initialized) {
        return;
    }
    
    recycledObjects = new DuplicatePool(objectConstructor, script.count);
    activeObjects = [];
    
    spawnDeltaTime = script.lifetime / script.count;
    spawnTime = 0;
    prevTime = getTime();
    
    script.createEvent("UpdateEvent").bind(onUpdate);
}

function onUpdate(eventData) {
    
    var curTime = getTime();
    
    updateObjects(eventData.getDeltaTime());
    
    if(curTime >= spawnTime) {
        
        if(activeObjects.length < script.count)
            spawn();
        
        spawnTime = curTime + spawnDeltaTime;
    }
}

function updateObjects(dt) {
    
    var n = activeObjects.length;
    var i = n;
    while (i--) {
        var activeObject = activeObjects[i];
        activeObject.update(dt);
        if(activeObject.shouldDie()) {
            recycledObjects.recycle(activeObject);
            activeObjects.splice(i, 1);
        }
    }
}

function objectConstructor() {
    
    var obj = thisSceneObject.copyWholeHierarchy(originalObjects[objectToSpawnIndex]);
    objectToSpawnIndex = (objectToSpawnIndex + 1) % originalObjects.length;
    return new SpawnedObject(obj);
}

function spawn() {
    
    var spawnedObject = recycledObjects.get();
    var position = vec3.zero();
    position.x += (Math.random() - 0.5) * script.spawnBoxSize.x + script.spawnBoxOffset.x;
    position.y += (Math.random() - 0.5) * script.spawnBoxSize.y + script.spawnBoxOffset.y;
    position.z += (Math.random() - 0.5) * script.spawnBoxSize.z + script.spawnBoxOffset.z;
    
    spawnedObject.spawn(script.lifetime, position);
    
    if(script.rotation) {
        
        // Rotation we will apply to the object's current rotation
        var rotation = quat.fromEulerAngles(radians.x + (Math.random() - 0.5) * radiansVariance.x, radians.y + (Math.random() - 0.5) * radiansVariance.y, radians.z + (Math.random() - 0.5) * radiansVariance.z);
        
        var rotSpeed = rotationStrength + (Math.random() - 0.5) * rotationStrengthVariance;
        
        if(script.rotationBothSides && Math.random() > 0.5) {
            
            rotSpeed *= -1;
        }
        spawnedObject.addRotation(rotation, rotSpeed);
    }
    
    
    if (script.move) {

        var thisSpeed = new vec3(0, 0, 0);
        var thisForce = new vec3(0, 0, 0);
        
        thisSpeed.x = speed.x + (Math.random() - 0.5) * speedVariance;
        thisSpeed.y = speed.y + (Math.random() - 0.5) * speedVariance;
        thisSpeed.z = speed.z + (Math.random() - 0.5) * speedVariance;

        thisForce.x = force.x + (Math.random() - 0.5) * forceVariance;
        thisForce.y = force.y + (Math.random() - 0.5) * forceVariance;
        thisForce.z = force.z + (Math.random() - 0.5) * forceVariance;
    
        spawnedObject.addMovement(thisSpeed, thisForce);
    }
    
    activeObjects.push(spawnedObject);
}

//Helper functions

function createCallback(scriptComponents, eventName) {
    
    return function() {
        for(var i = 0; i < scriptComponents.length; i++) {
            if(scriptComponents[i].api[eventName]) {
                scriptComponents[i].api[eventName]();
            }
        }
    }
}

function getComponentsInSceneObjects(sceneObjects, name) {
    
    var components = [];
    for (j in sceneObjects) {
        var componentCount = sceneObjects[j].getComponentCount(name);
        if(componentCount > 0) {
            for(var i = 0; i < componentCount; i++) {
                components.push(sceneObjects[j].getComponentByIndex(name, i));
            }
        }
    }
    return components;
}

function getAllChildren(sceneObject) {
    
    var childArr = [];
    putChildrenRecursively(sceneObject, childArr);
    return childArr;
}

function putChildrenRecursively(so, arr) {
    
    arr.push(so);
    var childrenCount = so.getChildrenCount();
    for(var i = 0; i < childrenCount; i++) {
        putChildrenRecursively(so.getChild(i), arr);
    }
}

function switchRenderLayer(sceneObjects, visible) {
    
    for(var i in sceneObjects) {
        sceneObjects[i].layer = visible ? visibleLayerSet : hiddenLayerSet;
    }
}

function switchCamera(sceneObjects, isForeground) {
    
    for(var i in sceneObjects) {
        sceneObjects[i].layer = isForeground ? fgCamera : bgCamera;
    }
}

//SpawnedObject the class responsible for spawned object's lifecycle, including its movement

var SpawnedObject = function(sceneObject) {
    
    this.sceneObject = sceneObject;
    this.transform = sceneObject.getTransform();
    this.children = getAllChildren(sceneObject);
    var scriptComponents = getComponentsInSceneObjects(this.children, "ScriptComponent");
    
    // Functions
    this.onSpawned = createCallback(scriptComponents, "onSpawned");
    this.onRecycled = createCallback(scriptComponents, "onRecycled");
    this.positionUpdate;
    this.rotationUpdate;
    
    // Properties
    this.justSpawned = null;
    this.timeLeft;
}

SpawnedObject.prototype.spawn = function(lifetime, pos) {
    
    this.timeLeft = lifetime >= 0 ? lifetime : undefined;
    if(this.justSpawned == null)
        this.transform.setLocalScale(this.transform.getLocalScale().uniformScale(size + (Math.random() - 0.5) * sizeVariance));
    
    this.transform.setWorldPosition(pos);
    
    switchRenderLayer(this.children, true);
    
    switchCamera(this.children, pos.z >= diffPoint ? true : false);
    this.justSpawned = true;
}

SpawnedObject.prototype.addMovement = function(s, f) {
    
    this.speed = s;
    this.force = f;
    this.positionUpdate = true;
}

SpawnedObject.prototype.addRotation = function(axis, speed) {
    
    this.rotationAxis = axis;
    this.rotationSpeed = speed;
    
    this.transform.setLocalRotation(this.rotationAxis);
    this.rotationUpdate = true;
}

SpawnedObject.prototype.update = function(dt) {
    
    if(this.justSpawned) {
        this.onSpawned();
        this.justSpawned = false;
    }
    
    if(this.timeLeft) {
        this.timeLeft -= dt;
    }
    
    var position = this.transform.getWorldPosition();
    
    if(this.positionUpdate) {
        this.speed = this.speed.add(this.force.uniformScale(dt)); // movement
        if(script.inputMode == 1) {
            newSpeed.x = this.speed.x + headTransform.getWorldRotation().y * 2 * script.manipulationStrengthFace;
            newSpeed.y = this.speed.y;
            newSpeed.z = this.speed.z;
        }
        else
            newSpeed = this.speed;
        this.transform.setWorldPosition(position.add(newSpeed.uniformScale(dt)));
    }
    
    if(this.rotationUpdate) {
        
        var rotation = this.transform.getLocalRotation();
        var rotateBy = quat.angleAxis(Math.PI*getDeltaTime()*this.rotationSpeed, vec3.up()); // ONLY UP?
        rotation = rotation.multiply(rotateBy);
        this.transform.setLocalRotation(rotation);
    }
}

SpawnedObject.prototype.shouldDie = function() {
    return this.timeLeft != undefined && this.timeLeft <= 0;
}

SpawnedObject.prototype.recycle = function() {
    this.onRecycled();
    switchRenderLayer(this.children, false);
}

SpawnedObject.prototype.destroy = function() {
    this.sceneObject.destroy();
}

// Description: The class that manages duplication and reuse of an object or resource (SceneObject, material, etc);

var DuplicatePool = function(constructor, maxCount) {
    
    this.constructor = constructor;
    this.maxCount = maxCount;
    this.objects = [];
    this.count = 0;
}

DuplicatePool.prototype.get = function() { // API to allow user to get item from the pool of the duplicated things
    
    if(this.count > 0) {
        this.count -= 1;
        var obj = this.objects[this.count];
        this.objects[this.count] = null;
        return obj;
    }
    return this.constructor();
}

DuplicatePool.prototype.recycle = function(obj) { // API to allow user to return object back to the pool for reuse
    
    if(this.count < this.maxCount) {
        if(obj.recycle) {
            obj.recycle();
        }
        this.objects[this.count] = obj;
        this.count += 1;
    }
    else {
        if(obj.destroy) {
            obj.destroy();
        }
    }
}

DuplicatePool.prototype.getSize = function() {
    return this.count;
}