"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = undefined;

var _utils = require("./utils.js");

var _response = require("./response.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var fetch;

if (typeof window !== 'undefined') {
  fetch = window.fetch.bind(window);
} else {
  fetch = require('node-fetch'); // eslint-disable-line global-require
}

var crypto;

if (typeof window !== 'undefined') {
  crypto = window.crypto || window.msCrypto; // for IE11
} else {
  crypto = require('crypto'); // eslint-disable-line global-require
}

var Encoder;

if (typeof TextEncoder === 'undefined') {
  Encoder = require('util').TextEncoder; // eslint-disable-line global-require
} else {
  Encoder = TextEncoder;
} // Expiration is 300 seconds but needs to be in milliseconds for Date object


var TokenExpirationBuffer = 300 * 1000;
var PKCELength = 128;
var TokenAccessTypes = ['legacy', 'offline', 'online'];
var GrantTypes = ['code', 'token'];
var IncludeGrantedScopes = ['none', 'user', 'team'];
var BaseAuthorizeUrl = 'https://www.dropbox.com/oauth2/authorize';
var BaseTokenUrl = 'https://api.dropboxapi.com/oauth2/token';
/**
 * @class DropboxAuth
 * @classdesc The DropboxAuth class that provides methods to manage, acquire, and refresh tokens.
 * @arg {Object} options
 * @arg {Function} [options.fetch] - fetch library for making requests.
 * @arg {String} [options.accessToken] - An access token for making authenticated
 * requests.
 * @arg {Date} [options.AccessTokenExpiresAt] - Date of the current access token's
 * expiration (if available)
 * @arg {String} [options.refreshToken] - A refresh token for retrieving access tokens
 * @arg {String} [options.clientId] - The client id for your app. Used to create
 * authentication URL.
 * @arg {String} [options.clientSecret] - The client secret for your app. Used to create
 * authentication URL and refresh access tokens.
 */

var DropboxAuth = /*#__PURE__*/function () {
  function DropboxAuth(options) {
    _classCallCheck(this, DropboxAuth);

    options = options || {};
    this.fetch = options.fetch || fetch;
    this.accessToken = options.accessToken;
    this.accessTokenExpiresAt = options.accessTokenExpiresAt;
    this.refreshToken = options.refreshToken;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
  }
  /**
   * Set the access token used to authenticate requests to the API.
   * @arg {String} accessToken - An access token
   * @returns {undefined}
   */


  _createClass(DropboxAuth, [{
    key: "setAccessToken",
    value: function setAccessToken(accessToken) {
      this.accessToken = accessToken;
    }
    /**
     * Get the access token
     * @returns {String} Access token
     */

  }, {
    key: "getAccessToken",
    value: function getAccessToken() {
      return this.accessToken;
    }
    /**
     * Set the client id, which is used to help gain an access token.
     * @arg {String} clientId - Your apps client id
     * @returns {undefined}
     */

  }, {
    key: "setClientId",
    value: function setClientId(clientId) {
      this.clientId = clientId;
    }
    /**
     * Get the client id
     * @returns {String} Client id
     */

  }, {
    key: "getClientId",
    value: function getClientId() {
      return this.clientId;
    }
    /**
     * Set the client secret
     * @arg {String} clientSecret - Your app's client secret
     * @returns {undefined}
     */

  }, {
    key: "setClientSecret",
    value: function setClientSecret(clientSecret) {
      this.clientSecret = clientSecret;
    }
    /**
     * Get the client secret
     * @returns {String} Client secret
     */

  }, {
    key: "getClientSecret",
    value: function getClientSecret() {
      return this.clientSecret;
    }
    /**
     * Gets the refresh token
     * @returns {String} Refresh token
     */

  }, {
    key: "getRefreshToken",
    value: function getRefreshToken() {
      return this.refreshToken;
    }
    /**
     * Sets the refresh token
     * @param refreshToken - A refresh token
     */

  }, {
    key: "setRefreshToken",
    value: function setRefreshToken(refreshToken) {
      this.refreshToken = refreshToken;
    }
    /**
     * Gets the access token's expiration date
     * @returns {Date} date of token expiration
     */

  }, {
    key: "getAccessTokenExpiresAt",
    value: function getAccessTokenExpiresAt() {
      return this.accessTokenExpiresAt;
    }
    /**
     * Sets the access token's expiration date
     * @param accessTokenExpiresAt - new expiration date
     */

  }, {
    key: "setAccessTokenExpiresAt",
    value: function setAccessTokenExpiresAt(accessTokenExpiresAt) {
      this.accessTokenExpiresAt = accessTokenExpiresAt;
    }
  }, {
    key: "generatePKCECodes",
    value: function generatePKCECodes() {
      var codeVerifier = crypto.randomBytes(PKCELength);
      codeVerifier = codeVerifier.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').substr(0, 128);
      this.codeVerifier = codeVerifier;
      var encoder = new Encoder();
      var codeData = encoder.encode(codeVerifier);
      var codeChallenge = crypto.createHash('sha256').update(codeData).digest();
      codeChallenge = codeChallenge.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      this.codeChallenge = codeChallenge;
    }
    /**
     * Get a URL that can be used to authenticate users for the Dropbox API.
     * @arg {String} redirectUri - A URL to redirect the user to after
     * authenticating. This must be added to your app through the admin interface.
     * @arg {String} [state] - State that will be returned in the redirect URL to help
     * prevent cross site scripting attacks.
     * @arg {String} [authType] - auth type, defaults to 'token', other option is 'code'
     * @arg {String} [tokenAccessType] - type of token to request.  From the following:
     * null - creates a token with the app default (either legacy or online)
     * legacy - creates one long-lived token with no expiration
     * online - create one short-lived token with an expiration
     * offline - create one short-lived token with an expiration with a refresh token
     * @arg {Array<String>} [scope] - scopes to request for the grant
     * @arg {String} [includeGrantedScopes] - whether or not to include previously granted scopes.
     * From the following:
     * user - include user scopes in the grant
     * team - include team scopes in the grant
     * Note: if this user has never linked the app, include_granted_scopes must be None
     * @arg {boolean} [usePKCE] - Whether or not to use Sha256 based PKCE. PKCE should be only use on
     * client apps which doesn't call your server. It is less secure than non-PKCE flow but
     * can be used if you are unable to safely retrieve your app secret
     * @returns {String} Url to send user to for Dropbox API authentication
     */

  }, {
    key: "getAuthenticationUrl",
    value: function getAuthenticationUrl(redirectUri, state) {
      var authType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'token';
      var tokenAccessType = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
      var scope = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
      var includeGrantedScopes = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 'none';
      var usePKCE = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;
      var clientId = this.getClientId();
      var baseUrl = BaseAuthorizeUrl;

      if (!clientId) {
        throw new Error('A client id is required. You can set the client id using .setClientId().');
      }

      if (authType !== 'code' && !redirectUri) {
        throw new Error('A redirect uri is required.');
      }

      if (!GrantTypes.includes(authType)) {
        throw new Error('Authorization type must be code or token');
      }

      if (tokenAccessType && !TokenAccessTypes.includes(tokenAccessType)) {
        throw new Error('Token Access Type must be legacy, offline, or online');
      }

      if (scope && !(scope instanceof Array)) {
        throw new Error('Scope must be an array of strings');
      }

      if (!IncludeGrantedScopes.includes(includeGrantedScopes)) {
        throw new Error('includeGrantedScopes must be none, user, or team');
      }

      var authUrl;

      if (authType === 'code') {
        authUrl = "".concat(baseUrl, "?response_type=code&client_id=").concat(clientId);
      } else {
        authUrl = "".concat(baseUrl, "?response_type=token&client_id=").concat(clientId);
      }

      if (redirectUri) {
        authUrl += "&redirect_uri=".concat(redirectUri);
      }

      if (state) {
        authUrl += "&state=".concat(state);
      }

      if (tokenAccessType) {
        authUrl += "&token_access_type=".concat(tokenAccessType);
      }

      if (scope) {
        authUrl += "&scope=".concat(scope.join(' '));
      }

      if (includeGrantedScopes !== 'none') {
        authUrl += "&include_granted_scopes=".concat(includeGrantedScopes);
      }

      if (usePKCE) {
        this.generatePKCECodes();
        authUrl += '&code_challenge_method=S256';
        authUrl += "&code_challenge=".concat(this.codeChallenge);
      }

      return authUrl;
    }
    /**
     * Get an OAuth2 access token from an OAuth2 Code.
     * @arg {String} redirectUri - A URL to redirect the user to after
     * authenticating. This must be added to your app through the admin interface.
     * @arg {String} code - An OAuth2 code.
     * @returns {Object} An object containing the token and related info (if applicable)
    */

  }, {
    key: "getAccessTokenFromCode",
    value: function getAccessTokenFromCode(redirectUri, code) {
      var clientId = this.getClientId();
      var clientSecret = this.getClientSecret();

      if (!clientId) {
        throw new Error('A client id is required. You can set the client id using .setClientId().');
      }

      var path = BaseTokenUrl;
      path += '?grant_type=authorization_code';
      path += "&code=".concat(code);
      path += "&client_id=".concat(clientId);

      if (clientSecret) {
        path += "&client_secret=".concat(clientSecret);
      } else {
        if (!this.codeChallenge) {
          throw new Error('You must use PKCE when generating the authorization URL to not include a client secret');
        }

        path += "&code_verifier=".concat(this.codeVerifier);
      }

      if (redirectUri) {
        path += "&redirect_uri=".concat(redirectUri);
      }

      var fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };
      return this.fetch(path, fetchOptions).then(function (res) {
        return (0, _response.parseResponse)(res);
      });
    }
    /**
     * Checks if a token is needed, can be refreshed and if the token is expired.
     * If so, attempts to refresh access token
     * @returns {Promise<*>}
     */

  }, {
    key: "checkAndRefreshAccessToken",
    value: function checkAndRefreshAccessToken() {
      var canRefresh = this.getRefreshToken() && this.getClientId();
      var needsRefresh = !this.getAccessTokenExpiresAt() || new Date(Date.now() + TokenExpirationBuffer) >= this.getAccessTokenExpiresAt();
      var needsToken = !this.getAccessToken();

      if ((needsRefresh || needsToken) && canRefresh) {
        return this.refreshAccessToken();
      }

      return Promise.resolve();
    }
    /**
     * Refreshes the access token using the refresh token, if available
     * @arg {Array<String>} scope - a subset of scopes from the original
     * refresh to acquire with an access token
     * @returns {Promise<*>}
     */

  }, {
    key: "refreshAccessToken",
    value: function refreshAccessToken() {
      var _this = this;

      var scope = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var refreshUrl = BaseTokenUrl;
      var clientId = this.getClientId();
      var clientSecret = this.getClientSecret();

      if (!clientId) {
        throw new Error('A client id is required. You can set the client id using .setClientId().');
      }

      if (scope && !(scope instanceof Array)) {
        throw new Error('Scope must be an array of strings');
      }

      var headers = {};
      headers['Content-Type'] = 'application/json';
      refreshUrl += "?grant_type=refresh_token&refresh_token=".concat(this.getRefreshToken());
      refreshUrl += "&client_id=".concat(clientId);

      if (clientSecret) {
        refreshUrl += "&client_secret=".concat(clientSecret);
      }

      if (scope) {
        refreshUrl += "&scope=".concat(scope.join(' '));
      }

      var fetchOptions = {
        method: 'POST'
      };
      fetchOptions.headers = headers;
      return this.fetch(refreshUrl, fetchOptions).then(function (res) {
        return (0, _response.parseResponse)(res);
      }).then(function (res) {
        _this.setAccessToken(res.result.access_token);

        _this.setAccessTokenExpiresAt((0, _utils.getTokenExpiresAtDate)(res.result.expires_in));
      });
    }
    /**
     * An authentication process that works with cordova applications.
     * @param {successCallback} successCallback
     * @param {errorCallback} errorCallback
     */

  }, {
    key: "authenticateWithCordova",
    value: function authenticateWithCordova(successCallback, errorCallback) {
      var redirectUrl = 'https://www.dropbox.com/1/oauth2/redirect_receiver';
      var url = this.getAuthenticationUrl(redirectUrl);
      var removed = false;
      var browser = window.open(url, '_blank');

      function onLoadError(event) {
        if (event.code !== -999) {
          // Workaround to fix wrong behavior on cordova-plugin-inappbrowser
          // Try to avoid a browser crash on browser.close().
          window.setTimeout(function () {
            browser.close();
          }, 10);
          errorCallback();
        }
      }

      function onLoadStop(event) {
        var errorLabel = '&error=';
        var errorIndex = event.url.indexOf(errorLabel);

        if (errorIndex > -1) {
          // Try to avoid a browser crash on browser.close().
          window.setTimeout(function () {
            browser.close();
          }, 10);
          errorCallback();
        } else {
          var tokenLabel = '#access_token=';
          var tokenIndex = event.url.indexOf(tokenLabel);
          var tokenTypeIndex = event.url.indexOf('&token_type=');

          if (tokenIndex > -1) {
            tokenIndex += tokenLabel.length; // Try to avoid a browser crash on browser.close().

            window.setTimeout(function () {
              browser.close();
            }, 10);
            var accessToken = event.url.substring(tokenIndex, tokenTypeIndex);
            successCallback(accessToken);
          }
        }
      }

      function onExit() {
        if (removed) {
          return;
        }

        browser.removeEventListener('loaderror', onLoadError);
        browser.removeEventListener('loadstop', onLoadStop);
        browser.removeEventListener('exit', onExit);
        removed = true;
      }

      browser.addEventListener('loaderror', onLoadError);
      browser.addEventListener('loadstop', onLoadStop);
      browser.addEventListener('exit', onExit);
    }
  }]);

  return DropboxAuth;
}();

exports["default"] = DropboxAuth;