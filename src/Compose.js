var isArray = Array.isArray,
    isFunction = function( thing ) { return thing instanceof Function; },
    isPositiveInteger = function( thing ) { return !isNaN( thing ) && thing > 0 && thing % 1 === 0 },
    map = Array.prototype.map,
    slice = Array.prototype.slice;

/**
 * Converts a function, array, or object into an object usable by _runComposed.
 * The returned object will have the following properties:
 *   callback  The function to invoke upon reaching this object in the call stack
 *   context   The value to which set 'this' should be set during invocation.
 *             To reuse 'this' from the previous invocation, set 'context' to the compose function.
 *   length    The number of arguments to devote to the callback
 * 
 * Three different argument schemes are accepted:
 *   Function  
 *     'callback' is set to the given function
 *     'context' is set to the compose function
 *     'length' is set to the function's 'length' property
 *
 *   [ Function ( number | Object | (number, Object) | (Object, number) )? ] or
 *   { callback: Function, context?: Object, length?: number }
 *     'callback' is set to the given function
 *     'context' is set to the given Object, or compose if no Object is given
 *     'length' is set to the given number, or the function's 'length' if no number is given
 */
var _prepare = function( input ) {
  var ret;

  if( isFunction( input ) ) {
    // just given a function, so infer the other two
    ret = {
      callback: input,
      context:  compose,
      length:   input.length
    }
  } else if( isArray( input ) ) {
    ret = {
      callback: input[ 0 ]
    };

    // now check the other two
    if( input.length === 2 ) {
      if( isPositiveInteger( input[ 1 ] ) ) {
        ret.context = compose;
        ret.length = input[ 1 ];
      } else {
        ret.context = input[ 1 ];
        ret.length = ret.callback.length;
      }
    } else if( input.length > 2 ) {
      if( isPositiveInteger( input[ 1 ] ) ) {
        ret.context = input[ 2 ];
        ret.length = input[ 1 ];
      } else {
        ret.context = input[ 1 ];
        ret.length = input[ 2 ];
      }
    }
  } else if( input instanceof Object ) {
    ret = {
      callback: input.callback,
      context: input.context || compose,
      length: input.length || input.callback.length
    };
  } else {
    // error, can't handle this argument
    throw new Error("Error preparing 'compose': argument '" + input + "' is not a function, array, or object");
  }

  return ret;
};

var _runComposed = function _runComposed( arguments, functions ) {
  var valueQueue = arguments,
      lastThis = undefined,
      lastReturn = undefined,
      nextIndex = 0,
      next,
      nextArgs;
  
  // run through the functions one-by-one
  while( nextIndex < functions.length ) {
    // grab the next function
    next = functions[ nextIndex++ ];

    // make sure there are values to give
    if( valueQueue.length < next.length ) {
      throw new Error("Error invoking composed function " + ( nextIndex + 1 ) + " of " + functions.length
        + ": need " + next.length + " value(s), but only have " + valueQueue.length );
    }
    
    // grab the arguments
    nextArgs = valueQueue.splice( 0, next.length );

    // determine 'this'
    lastThis = next.context === compose ? lastThis : next.context;

    // apply the function, add its value to the queue
    valueQueue.push( next.callback.apply( lastThis, nextArgs ) );
  }

  // throw an error if there are extra values left over
  if( valueQueue.length > 1 ) {
    throw new Error("Error invoking composed function: all callbacks have been applied, but multiple values remain");
  }

  // otherwise, just return the last value!
  return valueQueue[ 0 ];
};

var compose = function compose(/* f1, ..., fn */) {
  var functions = map.call( arguments, _prepare ); // prepare the functions
  
  // this is the easy part, just defer to _runComposed
  return function() {
    return _runComposed( slice.call( arguments, 0 ), functions );
  };
};
