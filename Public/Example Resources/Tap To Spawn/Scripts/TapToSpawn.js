// TapToSpawn.js
// Version: 0.0.1
// Event: On Awake
// Description: Tap to spawn prefab on the world mesh

//@ui {"widget" : "group_start", "label" : "Portal Settings"}
// @input Component.DeviceTracking deviceTracking
// @input Asset.ObjectPrefab prefab {"label": "Prefab Portal"}
// --------Agrego una variable para la cantidad de portales
// @input int amount {"widget" : "slider", "min" : "0", "max" : "10", "step" : "1", "label" : "Amount of Portals"}
//@ui {"widget" : "group_end"}



//@ui {"widget" : "group_start", "label" : "Monster Settings"}
// @input int lifetime
// @input Asset.ObjectPrefab prefabMonster {"label": "Prefab Monster"}
// @input int countMonsters
//@ui {"widget" : "group_end"}


// ---------Resguardo variables
var count = script.amount;
var amountMonsters = script.countMonsters;
var arrayPortals=[];


var activeObjects=[];
var recycledObjects;

var spawnDeltaTime;
var spawnTime;

var thisSceneObject;
var originalObjects = [];
var objectToSpawnIndex;



if (!script.deviceTracking) {
    print("ERROR: Please set the device tracking to the script.");
    return;
}

if (!script.prefab) {
    print("ERROR: Please assign a prefab to the object that you want to be spawned.");
    return;
}

script.createEvent("TurnOnEvent").bind(onTurnOn);

//-----------funcion ready
function onTurnOn(){
    thisSceneObject  = script.getSceneObject();
    originalObjects = [];
    objectToSpawnIndex = 0;
}

function onTouch(eventData) {
    var touchPos = eventData.getTapPosition();
    //-------------Condiciono cantidad de portales
    if (count > 0){
        spawnObject(touchPos);
        count -=1;
    }
    
}

function spawnObject(screenPos) {
    var results = script.deviceTracking.hitTestWorldMesh(screenPos);

    if (results.length > 0) {
        var point = results[0].position;
        
        var normal = results[0].normal;
        point.y=point.y+10;
        var newObj = script.prefab.instantiate(null);
        newObj.getTransform().setWorldPosition(point);

        var up = vec3.up();
        var forwardDir = up.projectOnPlane(normal);
        var rot = quat.lookAt(forwardDir, normal);

        newObj.getTransform().setWorldRotation(rot);
        //-----------Resguardo portal creado
        script.createEvent("UpdateEvent").bind(onUpdate);
        arrayPortals.push(point)
    }
}

//-----------Spawn monsters
function onUpdate(eventData){
    if (amountMonsters>0 & (getTime()%4) <= 0.1){
        spawn();
        amountMonsters -=1;
    }
}

function spawn() {
    var newMonster = script.prefabMonster.instantiate(null);
    var position = arrayPortals[0];
    position.x +=Math.floor(Math.random()-0.5)*10;
    position.z +=Math.floor(Math.random()-0.5)*10;
    newMonster.getTransform().setWorldPosition(position);
}


script.api.spawnObject = spawnObject;
script.createEvent("TapEvent").bind(onTouch);