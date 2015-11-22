'use strict';

/* global document */

var _ = require('underscore');
var List = require('list.js');
var accordion = require('accordion/src/accordion');

var KEYCODE_ESC = 27;

// https://davidwalsh.name/element-matches-selector
function selectorMatches(el, selector) {
  var p = Element.prototype;
  var f = p.matches || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || function(s) {
    return [].indexOf.call(document.querySelectorAll(s), this) !== -1;
  };
  return f.call(el, selector);
}

var ITEM_TEMPLATE =
  '<li id="glossary-list-item" class="glossary__item">' +
    '<div class="js-accordion_header accordion__header">' +
      '<h4 class="glossary-term"></h4>' +
      '<button class="button button--secondary accordion__button js-accordion_button">' +
        '<span class="js-accordion_text u-visually-hidden" data-show="Show definition" data-hide="Hide definition"></span>' +
      '</button>' +
    '</div>' +
    '<p class="glossary-definition js-accordion_item"></p>' +
  '</li>';

var defaultSelectors = {
  body: '#glossary',
  toggle: '.js-glossary-toggle',
  term: '.term'
};

function removeTabindex($elm) {
  var elms = getTabIndex($elm);
  [].forEach.call(elms, function(elm) {
    elm.setAttribute('tabIndex', '-1');
  });
}

function restoreTabindex($elm) {
  var elms = getTabIndex($elm);
  [].forEach.call(elms, function(elm) {
    elm.setAttribute('tabIndex', '0');
  });
}

function getTabIndex($elm) {
  return $elm.querySelectorAll('a, button, input, [tabindex]');
}

/**
 * Glossary widget
 * @constructor
 * @param {Array} terms - Term objects with "glossary-term" and "glossary-definition" keys
 * @param {Object} selectors - CSS selectors for glossary components
 */
function Glossary(terms, selectors) {
  this.terms = terms;
  this.selectors = _.extend({}, defaultSelectors, selectors);

  this.$body = document.querySelector(this.selectors.body);
  this.$toggle = document.querySelector(this.selectors.toggle);
  this.$search = this.$body.querySelector('.glossary__search');

  // Initialize state
  this.isOpen = false;

  // Update DOM
  this.populate();
  this.linkTerms();

  // Remove tabindices
  removeTabindex(this.$body);

  // Initialize accordions
  var accordions = this.$body.querySelectorAll('.js-accordion');
  [].forEach.call(accordions, function(elm) {
    Object.create(accordion).init(elm);
  });

  // Bind listeners
  this.$toggle.addEventListener('click', this.toggle.bind(this));
  this.$body.addEventListener('click', '.toggle', this.toggle.bind(this));
  this.$search.addEventListener('input', this.handleInput.bind(this));

  document.body.addEventListener('keyup', this.handleKeyup.bind(this));
}

/** Populate internal list.js list of terms */
Glossary.prototype.populate = function() {
  var options = {
    item: ITEM_TEMPLATE,
    valueNames: ['glossary-term'],
    listClass: 'glossary__list',
    searchClass: 'glossary__search'
  };
  this.list = new List('glossary', options, this.terms);
  this.list.sort('glossary-term', {order: 'asc'});
};

/** Add links to terms in body */
Glossary.prototype.linkTerms = function() {
  var $terms = document.querySelectorAll(this.selectors.term);
  [].forEach.call($terms, function(term) {
    term.setAttribute('title', 'Click to define');
    term.setAttribute('tabIndex', 0);
    term.setAttribute('data-term', (term.getAttribute('data-term') || '').toLowerCase());
  });
  document.body.addEventListener('click', this.handleTermTouch.bind(this));
  document.body.addEventListener('keyup', this.handleTermTouch.bind(this));
};

Glossary.prototype.handleTermTouch = function(e) {
  if (e.which === 13 || e.type === 'click') {
    if (selectorMatches(e.target, this.selectors.term)) {
      this.show();
      this.findTerm(e.target.getAttribute('data-term'));
    }
  }
};

/** Highlight a term */
Glossary.prototype.findTerm = function(term) {
  this.$search.value = term;

  // Highlight the term and remove other highlights
  [].forEach.call(this.$body.querySelectorAll('.term--highlight'), function(term) {
    term.classList.remove('term--highlight');
  });
  [].forEach.call(this.$body.querySelectorAll('span[data-term="' + term + '"]'), function(term) {
    term.classList.add('term--highlight');
  });
  this.list.filter(function(item) {
    return item._values['glossary-term'].toLowerCase() === term;
  });

  // Hack: Expand text for selected item
  this.list.search();
  this.list.visibleItems.forEach(function(item) {
    var $elm = item.elm.querySelector('div');
    if ($elm.classList.contains('accordion--collapsed')) {
      $elm.querySelector('.accordion__button').click();
    }
  });
};

Glossary.prototype.toggle = function() {
  var method = this.isOpen ? this.hide : this.show;
  method.apply(this);
};

Glossary.prototype.show = function() {
  this.$body.classList.add('is-open');
  this.$body.setAttribute('aria-hidden', 'false');
  this.$toggle.classList.add('active');
  this.$search.focus();
  this.isOpen = true;
  restoreTabindex(this.$body);
};

Glossary.prototype.hide = function() {
  this.$body.classList.remove('is-open');
  this.$body.setAttribute('aria-hidden', 'true');
  this.$toggle.classList.remove('active');
  this.$toggle.focus();
  this.isOpen = false;
  removeTabindex(this.$body);
};

/** Remove existing filters on input */
Glossary.prototype.handleInput = function() {
  if (this.list.filtered) {
    this.list.filter();
  }
};

/** Close glossary on escape keypress */
Glossary.prototype.handleKeyup = function(e) {
  if (e.keyCode == KEYCODE_ESC) {
    if (this.isOpen) {
      this.hide();
    }
  }
};

module.exports = {Glossary: Glossary};
