
/**
 * Maze class
 * @param $element
 */
function threemaze($element)
{
    // Object attributes
    this.$element =         $element;
    this.camera =           {};
    this.cameraHelper =     {};
    this.scene =            {};
    this.materials =        {};
    this.map =              [];
    this.renderer =         {};
    this.player =           {};
    this.end =              {};
    this.side =             31;
    this.thickness =        20;

    // Inits
    this.initScene();
    this.onWindowResize();
    this.render();

    // Events
    this.$element.on('mousemove', $.proxy(this,'onMouseMove'));
    this.$element.on('mousedown', $.proxy(this, 'onMouseDown'));
    this.$element.on('mouseup', $.proxy(this, 'onMouseUp'));
    this.$element.find('.generate').on('click', $.proxy(this, 'onGenerateMaze')).trigger('click');
    $(window).on('resize', $.proxy(this, 'onWindowResize'));
    $(document).on('keydown', $.proxy(this, 'onKeyDown'));
};

/**
 * Generates a new maze
 * Loops into the maze, removes old blocks and adds new ones
 */
threemaze.prototype.onGenerateMaze = function()
{
    var new_map =           this.generateMaze(this.side);
    var new_player_path =   [];
    var delay =             0;
    var self =              this;
    for (var x = this.side; x > 0; x -= 1)
    {
        new_player_path[x] = [];
        for (var y = 1;y < this.side + 1; y += 1)
        {
            // Inits player path
            new_player_path[x][y] = false;

            // Removes old mesh if needed
            if (typeof this.map[x] != 'undefined' && typeof this.map[x][y] != 'undefined' && typeof this.map[x][y] == 'object')
            {
                var tween = new TWEEN.Tween({scale: 1, y: this.thickness / 2, mesh: this.map[x][y]}).to({scale: 0, y: 0}, 200).delay(delay);
                var self = this;
                tween.onUpdate(this.onUpdateTweeningMesh);
                tween.onComplete(function()
                {
                    this.mesh.visible = false;
                    self.scene.remove(this.mesh);
                });
                tween.start();
            }

            // Removes player path if needed
            if (typeof this.player.path != 'undefined' && typeof this.player.path[x] != 'undefined' && typeof this.player.path[x][y] != 'undefined' && typeof this.player.path[x][y] == 'object')
            {
                this.removePlayerPath(x, y, delay);
            }

            // Adds a new mesh if needed
            if (new_map[x][y] == 0)
            {
                // Generates the mesh
                var wall_geometry =     new THREE.CubeGeometry(this.thickness, this.thickness, this.thickness, 1, 1, 1);
                new_map[x][y] =         new THREE.Mesh(wall_geometry, this.materials.grey);
                new_map[x][y].visible = false;
                new_map[x][y].position.set(x * this.thickness - ((this.side * this.thickness) / 2), 0, y * 20 - ((this.side * this.thickness) / 2));
                this.scene.add(new_map[x][y]);

                // Builds the related tween
                var tween = new TWEEN.Tween({scale: 0, y: 0, mesh: new_map[x][y]}).to({scale: 1, y: this.thickness / 2}, 300).delay(delay);
                tween.onUpdate(this.onUpdateTweeningMesh);
                tween.onStart(function()
                {
                    this.mesh.visible = true;
                });
                tween.start();
            }
            else
            {
                new_map[x][y] = false;
            }
        }
        delay += 50;
    }

    // Animates the end block
    var end_hide_tween = new TWEEN.Tween({scale: 1, y: this.thickness / 2, mesh: this.end}).to({scale: 0, y: 0}, 300);
    var end_show_tween = new TWEEN.Tween({scale: 0, y: 0, mesh: this.end}).to({scale: 1, y: this.thickness / 2}, 300).delay(delay);
    end_hide_tween.onUpdate(this.onUpdateTweeningMesh);
    end_show_tween.onUpdate(this.onUpdateTweeningMesh);
    end_show_tween.onStart(function()
    {
        this.mesh.visible = true;
    });
    end_hide_tween.onComplete(function()
    {
        this.mesh.visible = false;
    });
    if (this.end.scale != 0)
    {
        end_hide_tween.start();
    }
    end_show_tween.start();

    this.map =          new_map;
    this.player.path =  new_player_path;

    // Inits player
    this.player.mazePosition = {x: this.side - 1, z: this.side - 1};
    this.movePlayer(false);
};

/**
 * Updates a mesh when doing a tween
 * @param x
 * @param y
 * @param delay
 */
threemaze.prototype.onUpdateTweeningMesh = function()
{
    this.mesh.scale.y =     this.scale;
    this.mesh.position.y =  this.y;
};

/**
 * Removes a mesh from the player path
 * @param x
 * @param y
 * @param delay
 */
threemaze.prototype.removePlayerPath = function(x, y, delay)
{
    var tween = new TWEEN.Tween({scale: 1, y: this.thickness / 8, mesh: this.player.path[x][y]}).to({scale: 0, y: this.thickness * 5}, 300).delay(delay);
    var self =  this;
    this.player.path[x][y] = false;
    tween.onUpdate(function()
    {
        this.mesh.scale.set(this.scale, this.scale, this.scale);
        this.mesh.position.y = this.y;
    });
    tween.onComplete(function()
    {
        self.scene.remove(this.mesh);
    });
    tween.onStart(function()
    {
        this.mesh.visible = true;
    });
    tween.start();
};

/**
 * Inits the scene
 */
threemaze.prototype.initScene = function()
{
    // Scene
    this.scene = new THREE.Scene();

    // Materials
    this.materials =
    {
        grey:   new THREE.MeshLambertMaterial({color: 0xffffff, wireframe: false}),
        red:    new THREE.MeshLambertMaterial({color: 0xcb4e4e, ambient: 0xcb4e4e, lineWidth: 1})
    };

    // Camera
    this.camera =            new THREE.PerspectiveCamera(45, 1, 1, 2000);
    this.camera.clicked =    false;

    // Lights
    this.scene.add(new THREE.AmbientLight(0x999999));
    var directional = new THREE.DirectionalLight(0xffffff, 0.5);
    directional.position.set(0, 0.5, 1);
    this.scene.add(directional);

    // Player
    this.player =      new THREE.Object3D();
    var head_mesh =    new THREE.Mesh(new THREE.SphereGeometry(this.thickness / 2, 9, 9), this.materials.red);
    var body_mesh =    new THREE.Mesh(new THREE.CylinderGeometry(this.thickness / 6, this.thickness / 2, this.thickness * 1.5, 12, 1), this.materials.red);
    this.player.add(head_mesh);
    this.player.add(body_mesh);
    head_mesh.position.y = this.thickness * 1.5;
    body_mesh.position.y = this.thickness;
    this.scene.add(this.player);

    // End of the maze
    this.end = new THREE.Mesh(new THREE.CubeGeometry(this.thickness, this.thickness, this.thickness, 1, 1, 1), this.materials.red);
    this.end.position.set(-((this.side / 2) * this.thickness) + (this.thickness * 2), 0, -((this.side / 2) * this.thickness) + (this.thickness * 2));
    this.end.scale.y = 0;
    this.end.visible = false;
    this.scene.add(this.end);

    // Camera helper
    var geometry =  new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.sqrt(3) * (this.side * this.thickness)), 0, 0);
    this.cameraHelper = new THREE.Line(geometry);
    this.scene.add(this.cameraHelper);
    this.cameraHelper.visible =         false;
    this.cameraHelper.targetRotation =  false;
    this.cameraHelper.rotation.set(0, 1.362275, 0.694716);

    // Renderer
    this.renderer = typeof WebGLRenderingContext != 'undefined' && window.WebGLRenderingContext ? new THREE.WebGLRenderer({antialias: true}) : new THREE.CanvasRenderer({});
    this.$element.append(this.renderer.domElement);
};

/**
 * Keydown action
 * @param evt
 */
threemaze.prototype.onKeyDown = function(evt)
{
    // Gets the direction depending on the pressed key
    var code =      evt.keyCode;
    var direction = {x: 0, z: 0};
    var directions =
    {
        37: {x: 1, z: 0},
        39: {x: -1, z: 0},
        38: {x: 0, z: 1},
        40: {x: 0, z: -1}
    };
    if (typeof directions[code] != 'undefined')
    {
        direction = directions[code];
    }
    else
    {
        return;
    }

    var x = this.player.mazePosition.x;
    var z = this.player.mazePosition.z;
    var target_block = this.map[x + direction.x][z + direction.z];
    if (target_block === false)
    {
        // If the player moves forward, adds a block to the path
        if (this.player.path[x + direction.x][z + direction.z] === false)
        {
            // Builds the mesh
            this.player.path[x][z] = new THREE.Mesh(new THREE.CubeGeometry(this.thickness, this.thickness / 4, this.thickness, 1, 1, 1),  this.materials.red);
            this.player.path[x][z].position.set(-((this.side * this.thickness) / 2) + x * this.thickness, this.thickness * 5, -((this.side * this.thickness) / 2) + z * this.thickness);
            this.player.path[x][z].scale.set(0, 0, 0);
            this.scene.add(this.player.path[x][z]);

            // Builds the related tween
            var tween = new TWEEN.Tween({scale: 0, y: this.thickness * 5, mesh: this.player.path[x][z]}).to({scale: 1, y: this.thickness / 8}, 300).delay(150);
            tween.onUpdate(function()
            {
                this.mesh.scale.set(this.scale, this.scale, this.scale);
                this.mesh.position.y =  this.y;
            });
            tween.start();
        }
        // If he goes back, removes one
        else
        {
            this.removePlayerPath(x + direction.x, z + direction.z, 0);
        }

        // Updates the player position
        this.player.mazePosition.x += direction.x;
        this.player.mazePosition.z += direction.z;

        this.movePlayer();
    }
};

/**
 * Moves the player depending on its position on the maze
 * @param animate
 */
threemaze.prototype.movePlayer = function(animate)
{
    animate =   typeof animate == 'undefined' ? true : animate;
    var from =  {height: -Math.PI, x: this.player.position.x, z: this.player.position.z, mesh: this.player};
    var to =    {height: Math.PI,x: -((this.side * this.thickness) / 2) + this.player.mazePosition.x * this.thickness, z: -((this.side * this.thickness) / 2) + this.player.mazePosition.z * this.thickness}
    var tween = new TWEEN.Tween(from).to(to, animate ? 300 : 0);
    var self =  this;
    tween.onUpdate(function()
    {
        this.mesh.position.x = this.x;
        this.mesh.position.y = (Math.cos(this.height) + 1) * (self.thickness / 4);
        this.mesh.position.z = this.z;
    });
    // End of the maze: starts again
    tween.onComplete(function()
    {
        if (self.player.mazePosition.x == 2 && self.player.mazePosition.z == 2)
        {
            self.onGenerateMaze();
        }
    });
    tween.start();
};

/**
 * Moving the mouse over the container: sets a target rotation for the camera helper
 * @param evt
 */
threemaze.prototype.onMouseMove = function(evt)
{
    if (this.camera.clicked !== false)
    {
        var target_rotation = {z: this.cameraHelper.rotation.z + ((evt.pageY - this.camera.clicked.y) / 800), y: this.cameraHelper.rotation.y + ((this.camera.clicked.x - evt.pageX) / 800)};
        if (target_rotation.z < 0)
        {
            target_rotation.z = 0;
        }
        if (target_rotation.z > (Math.PI / 2) - 0.1)
        {
            target_rotation.z = Math.PI / 2 - 0.1;
        }
        this.cameraHelper.targetRotation = target_rotation;
    }
};

/**
 * Mouse down: starts dragging the maze
 * @param evt
 */
threemaze.prototype.onMouseDown = function(evt)
{
    evt.preventDefault();
    this.camera.clicked = {x: evt.pageX, y: evt.pageY};
};

/**
 * Mouse up: stops dragging the maze
 * @param evt
 */
threemaze.prototype.onMouseUp = function(evt)
{
    evt.preventDefault();
    this.camera.clicked = false;
};

/**
 * Render loop
 * Sets the camera position and renders the scene
 */
threemaze.prototype.render = function()
{
    requestAnimationFrame($.proxy(this, 'render'));
    TWEEN.update();
    if (this.cameraHelper.targetRotation !== false)
    {
        this.cameraHelper.rotation.z += (this.cameraHelper.targetRotation.z - this.cameraHelper.rotation.z) / 10;
        this.cameraHelper.rotation.y += (this.cameraHelper.targetRotation.y - this.cameraHelper.rotation.y) / 10;
    }
    this.camera.position = this.cameraHelper.geometry.vertices[1].clone().applyProjection(this.cameraHelper.matrixWorld);
    this.camera.lookAt(this.scene.position);
    this.renderer.render(this.scene, this.camera);
};

/**
 * Sets the scene dimensions on window resize
 */
threemaze.prototype.onWindowResize = function()
{
    var $window = $(window);
    this.renderer.setSize($window.width(), $window.height());
    this.camera.aspect = $window.width() / $window.height();
    this.camera.updateProjectionMatrix();
};
