(function(w,conf){
	
	w.myst = w.myst || {
		Model: {},
		Collection: {},
		View: {},
		Router: {}
	};
	
	myst.Model.Results = Backbone.Model.extend({
		reset: function(){
			init();
		},
		doAction: function( action ) {
			var alive = true;
			var energy = this.get("energy") + action.get("energy");
			var water = this.get("water") + action.get("water");
			var food = this.get("food") + action.get("food");
			// if water less then 0 we use energy to restore supply with rate 1:2
			if(water < 0) {
				energy += water * conf.energyRatio;
				water = 0;
				
			}
			//if food less then 0 we use energy to restore supply with rate 1:2
			if(food < 0) {
				energy += food * conf.energyRatio;
				food = 0;
			}
			while( energy < 0 ) {
				if(food <= 0 && water <= 0) break;
				if( food > 0 ) {
					food -= conf.energyRatio / 2;
					food = _.max([food,0]);
				}
				if( water > 0 ) {
					water -= conf.energyRatio / 2;
					water = _.max([water,0]);
				}
				energy++;
			}
			// if energy still les then 0 you are died baby 
			if( energy < 0 ) alive = false;
			
			var points = this.get("points") + action.get("points");
			var days = this.get("days"), 
				counter = this.get("counter") - action.get("energy");
			
			if(action.get("name") === "Sleep") {
				days++;
				counter = 0;
			} else {
				days += Math.floor( counter / conf.dayEnergy );
				counter = counter - Math.floor( counter / conf.dayEnergy ) * conf.dayEnergy;
			}
			this.set( {
				energy: Math.round(energy),
				food: Math.round(food),
				water: Math.round(water),
				points: points,
				days: days,
				rating: days ? Math.round( points / days ) : 0,
				counter: counter
			});
			// activate new component
			if(action.get("result")) {
				components.activate(action.get("result"));
			}
			selected.reset();
			if( !alive ) router.navigate( "end", { trigger:true } );
			if( action.get("name") === "Go away" ) router.navigate( "victory", { trigger:true } );
		}
		
	});
	
	myst.Model.Action = Backbone.Model.extend({
		
	});
	
	myst.Collection.ReadyActions = Backbone.Collection.extend({
		
		model: myst.Model.Action
		
	});
	
	myst.Model.Component = Backbone.Model.extend({
		defaults: function() {
			return {
				src: null,
				title: null,
				desc: null,
				visible: false
			};
		}
    });
    
    myst.Collection.ComponentList = Backbone.Collection.extend({
		
		model: myst.Model.Component,
		//localStorage: new Backbone.LocalStorage("myst-components")
		activate: function(title) {
			var cs = this.where({title: title});
			for(var i = 0; i < cs.length; i++) {
				cs[i].set("visible",true);
			}
			this.add(cs,{merge:true});
		}
		
    });
	
    myst.Collection.SelectedComponents = Backbone.Collection.extend({
		
		model: myst.Model.Component,
		
    });
    //Views
	myst.View.Intro = Backbone.View.extend({
	
		tagName: "div",
		template:_.template($('#tpl-intro').html()),
		events:{
            "click #get-started": "getStarted",
        },
		render: function( eventName ) {
			//this.template();
			$(this.el).html(this.template());
			return this;
		},
		getStarted: function() {
			init();
		}
    });
	
	myst.View.End = Backbone.View.extend({
		tagName: "div",
		className: "died-layout",
		template: _.template($('#tpl-end').html()),
		events:{
            "click #try-again": "restart"
        },
		render: function( eventName ) {
			$(this.el).html(this.template(this.model.toJSON()));
			return this;
		},
		restart: function() {
			init();
		}
	});
	
	myst.View.Victory = Backbone.View.extend({
		tagName: "div",
		className: "victory-layout",
		template: _.template($('#tpl-victory').html()),
		events:{
            "click #one-more": "restart"
        },
		render: function( eventName ) {
			$(this.el).html(this.template(this.model.toJSON()));
			return this;
		},
		restart: function() {
			init();
		}
	});
	
	myst.View.Results = Backbone.View.extend({
		
		tagName: "table",
		className: "results pure-table pure-table-striped",
		
		template: _.template($('#tpl-results').html()),
		
		initialize: function() {
			this.listenTo(this.model, 'change', this.render);
		},
		
		render:function (eventName) {
			$(this.el).html(this.template(this.model.toJSON()));
			return this;
		}
	});
	
	myst.View.ActiveComponents = Backbone.View.extend({
		
		tagName:"ul",
		className: "active-components",
		
		initialize: function() {
			this.listenTo( selected, 'reset', this.render );
			this.listenTo( components, 'add', this.render );
		},
		render: function ( eventName ) {
			$(this.el).html("");
			var visible = this.model.where({visible:true});
			_.each(visible,function(component){
				if( Math.random() < component.get("probability")) {
					var view = new myst.View.ActiveComponent( { model: component } );
					this.$el.append(view.render().el);
				}
			},this);
            return this;
		}
	});
	
	myst.View.ActiveComponent = Backbone.View.extend({
		tagName: "li",
		template:_.template($('#tpl-active-component').html()),
		render: function ( eventName ) {
			$(this.el).html(this.template(this.model.toJSON()));
			return this;
		},
		events:{
            "click .active-component": "selectComponent",
        },
        selectComponent: function() {
			if( $(this.el).hasClass("checked-component") ){
				$(this.el).removeClass("checked-component");
				selected.remove(this.model);
			} else {
				selected.add(this.model);
				$(this.el).addClass("checked-component");
			}
        }
 
    });
	
	myst.View.ReadyActions = Backbone.View.extend({
		tagName:"ul",
		className: "ready-actions",
		initialize: function() {
			this.listenTo( selected, 'all', this.render );
		},
		render: function ( eventName ) {
			$(this.el).html("");
			var titles = [];
			for( var i = 0; i < selected.models.length; i++ ) {
				titles.push(selected.models[i].get("title"));
			}
			//console.info(titles);
			this.model.each(function(action) {
				var needs = action.get("components");
				var visible = false;
				if(needs.length === titles.length && needs.length === 0 ) visible = true;
				else if(needs.length === titles.length && _.difference(needs,titles).length === 0) {
					visible = true;
				}
				if( visible ) {
					var view = new myst.View.ReadyAction( { model: action } );
					this.$el.append(view.render().el);
				}
			}, this);
            return this;
		}
	});
	
	myst.View.ReadyAction = Backbone.View.extend({
		tagName: "li",
		template:_.template($('#tpl-ready-action').html()),
		events:{
            "click .pure-button": "doit"
        },
		render: function ( eventName ) {
			$(this.el).html(this.template(this.model.toJSON()));
			return this;
		},
		doit: function() {
			results.doAction( this.model );
		}
	});

    // Router
    myst.Router = Backbone.Router.extend({
		
		routes:{
			"": "intro",
			"game": "game",
			"end": "end",
			"help": "help",
			"victory": "victory",
			"print": "print"
		},

		intro:  function() {
			var view = new myst.View.Intro();
			$('.pure-menu-selected').removeClass('pure-menu-selected');
			$('#menu-home').addClass('pure-menu-selected');
			$('#view').html( view.render().el );
		},
		
		game: function() {
			$('#view').html( _.template($('#tpl-game').html()));
			$('.pure-menu-selected').removeClass('pure-menu-selected');
			$('#menu-home').addClass('pure-menu-selected');
			
			var view = new myst.View.Results( { model: results } );
			$('#results-layout').html( view.render().el );
			
			var view = new myst.View.ActiveComponents( { model: components } );
			$('#active-components-layout').html( view.render().el );
			
			var view = new myst.View.ReadyActions( { model: actions } );
			$('#ready-actions-layout').html( view.render().el );
		},
		
		help:function() {
			$('.pure-menu-selected').removeClass('pure-menu-selected');
			$('#menu-help').addClass('pure-menu-selected');
			var template = _.template($('#tpl-help').html());
			$('#view').html(template({ components: conf.components }));
		},
		
		end: function() {
			var view = new myst.View.End({model:results});
			$('#view').html( view.render().el );
		},
		
		victory: function() {
			var view = new myst.View.Victory({model:results});
			$('#view').html( view.render().el );
		},
		
		print: function() {
			var template = _.template($('#tpl-print').html());
			$('#view').html(template({ conf: conf }));
		}
    });
	
	var components, actions, selected, results;
	
	var init = function(){
		components = new myst.Collection.ComponentList( conf.components );
		actions = new myst.Collection.ReadyActions( conf.actions );
		selected = new myst.Collection.SelectedComponents();
		results = new myst.Model.Results( conf.results );
	}
	
	init();
	var router = new myst.Router();
	Backbone.history.start();
	
}(window, config));



