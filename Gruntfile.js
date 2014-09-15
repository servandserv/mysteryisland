/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
module.exports = function(grunt) {
	// Project configuration.
	var mozjpeg = require('imagemin-mozjpeg');
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		concat: {
			options: {
				separator: ';'
			},
			js: {
				src: ['public_html/js/*.js','!public_html/js/*.all.js','!public_html/js/*.min.js'],
				dest: 'public_html/js/<%= pkg.name %>.all.js'
			},
			css: {
				src: ['public_html/css/*.css','!public_html/css/*.all.css','!public_html/css/*.min.css'],
				dest: 'public_html/css/<%= pkg.name %>.all.css'
			}
		},
		cssmin: {
			options: {
				banner: '/* w3c-cssvalidator skipme:true */'
			},
			css: {
				src: 'public_html/css/<%= pkg.name %>.all.css',
                dest: 'public_html/css/<%= pkg.name %>.min.css'
			}
		},
		uglify: {
			options: {
				banner: '/* jslint skipme:true */\n/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
			},
			js: {
				files: {
					'public_html/js/<%= pkg.name %>.min.js': ['<%= concat.js.dest %>']
				}
			}
		},
		jshint: {
			// define the files to lint
			files: ['Gruntfile.js', 'public_html/js/*.all.js'],
			// configure JSHint (documented at http://www.jshint.com/docs/)
			options: {
				// more options here if you want to override JSHint defaults
				globals: {
					jQuery: true,
					console: true,
					module: true
				}
			}
		},
		imagemin: {                          // Task
			all: {                         // Another target
				options: {                       // Target options
					optimizationLevel: 3,
					use: [mozjpeg()]
				},
				files: [{
					expand: true,                  // Enable dynamic expansion
					cwd: 'public_html/images/',                   // Src matches are relative to this path
					src: ['**/*.{png,jpg,gif}'],   // Actual patterns to match
					dest: 'dist/images/'                  // Destination path prefix
				}]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-imagemin');

	grunt.registerTask('default', [ 'concat:css', 'cssmin:css', 'concat:js', 'uglify:js' ]);
	grunt.registerTask('imgmin', [ 'imagemin:all' ]);
	grunt.registerTask('test',['jshint']);
};
