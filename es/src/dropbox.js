function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

import { UPLOAD, DOWNLOAD, RPC, APP_AUTH, TEAM_AUTH, USER_AUTH, NO_AUTH } from './constants.js';
import { routes } from '../lib/routes.js';
import DropboxAuth from './auth.js';
import { getBaseURL, httpHeaderSafeJson } from './utils.js';
import { parseDownloadResponse, parseResponse } from './response.js';
var fetch;

if (typeof window !== 'undefined') {
  fetch = window.fetch.bind(window);
} else {
  fetch = require('node-fetch'); // eslint-disable-line global-require
}

var b64 = typeof btoa === 'undefined' ? function (str) {
  return Buffer.from(str).toString('base64');
} : btoa;
/**
 * @class Dropbox
 * @classdesc The Dropbox SDK class that provides methods to read, write and
 * create files or folders in a user or team's Dropbox.
 * @arg {Object} options
 * @arg {Function} [options.fetch] - fetch library for making requests.
 * @arg {String} [options.selectUser] - Select user is only used for team functionality.
 * It specifies which user the team access token should be acting as.
 * @arg {String} [options.pathRoot] - root path to access other namespaces
 * Use to access team folders for example
 * @arg {String} [options.selectAdmin] - Select admin is only used by team functionality.
 * It specifies which team admin the team access token should be acting as.
 * @arg {DropboxAuth} [options.auth] - The DropboxAuth object used to authenticate requests.
 * If this is set, the remaining parameters will be ignored.
 * @arg {String} [options.accessToken] - An access token for making authenticated
 * requests.
 * @arg {Date} [options.accessTokenExpiresAt] - Date of the current access token's
 * expiration (if available)
 * @arg {String} [options.refreshToken] - A refresh token for retrieving access tokens
 * @arg {String} [options.clientId] - The client id for your app. Used to create
 * authentication URL.
 * @arg {String} [options.clientSecret] - The client secret for your app. Used to create
 * authentication URL and refresh access tokens.
 */

var Dropbox = /*#__PURE__*/function () {
  function Dropbox(options) {
    _classCallCheck(this, Dropbox);

    options = options || {};

    if (options.auth) {
      this.auth = options.auth;
    } else {
      this.auth = new DropboxAuth(options);
    }

    this.fetch = options.fetch || fetch;
    this.selectUser = options.selectUser;
    this.selectAdmin = options.selectAdmin;
    this.pathRoot = options.pathRoot;
    Object.assign(this, routes);
  }

  _createClass(Dropbox, [{
    key: "request",
    value: function request(path, args, auth, host, style) {
      switch (style) {
        case RPC:
          return this.rpcRequest(path, args, auth, host);

        case DOWNLOAD:
          return this.downloadRequest(path, args, auth, host);

        case UPLOAD:
          return this.uploadRequest(path, args, auth, host);

        default:
          throw new Error("Invalid request style: ".concat(style));
      }
    }
  }, {
    key: "rpcRequest",
    value: function rpcRequest(path, body, auth, host) {
      var _this = this;

      return this.auth.checkAndRefreshAccessToken().then(function () {
        var fetchOptions = {
          method: 'POST',
          body: body ? JSON.stringify(body) : null,
          headers: {}
        };

        if (body) {
          fetchOptions.headers['Content-Type'] = 'application/json';
        }

        var authHeader;

        switch (auth) {
          case APP_AUTH:
            if (!_this.auth.clientId || !_this.auth.clientSecret) {
              throw new Error('A client id and secret is required for this function');
            }

            authHeader = b64("".concat(_this.auth.clientId, ":").concat(_this.auth.clientSecret));
            fetchOptions.headers.Authorization = "Basic ".concat(authHeader);
            break;

          case TEAM_AUTH:
          case USER_AUTH:
            fetchOptions.headers.Authorization = "Bearer ".concat(_this.auth.getAccessToken());
            break;

          case NO_AUTH:
            break;

          default:
            throw new Error("Unhandled auth type: ".concat(auth));
        }

        _this.setCommonHeaders(fetchOptions);

        return fetchOptions;
      }).then(function (fetchOptions) {
        return _this.fetch(getBaseURL(host) + path, fetchOptions);
      }).then(function (res) {
        return parseResponse(res);
      });
    }
  }, {
    key: "downloadRequest",
    value: function downloadRequest(path, args, auth, host) {
      var _this2 = this;

      return this.auth.checkAndRefreshAccessToken().then(function () {
        if (auth !== USER_AUTH) {
          throw new Error("Unexpected auth type: ".concat(auth));
        }

        var fetchOptions = {
          method: 'POST',
          headers: {
            Authorization: "Bearer ".concat(_this2.auth.getAccessToken()),
            'Dropbox-API-Arg': httpHeaderSafeJson(args)
          }
        };

        _this2.setCommonHeaders(fetchOptions);

        return fetchOptions;
      }).then(function (fetchOptions) {
        return _this2.fetch(getBaseURL(host) + path, fetchOptions);
      }).then(function (res) {
        return parseDownloadResponse(res);
      });
    }
  }, {
    key: "uploadRequest",
    value: function uploadRequest(path, args, auth, host) {
      var _this3 = this;

      return this.auth.checkAndRefreshAccessToken().then(function () {
        if (auth !== USER_AUTH) {
          throw new Error("Unexpected auth type: ".concat(auth));
        }

        var contents = args.contents;
        delete args.contents;
        var fetchOptions = {
          body: contents,
          method: 'POST',
          headers: {
            Authorization: "Bearer ".concat(_this3.auth.getAccessToken()),
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': httpHeaderSafeJson(args)
          }
        };

        _this3.setCommonHeaders(fetchOptions);

        return fetchOptions;
      }).then(function (fetchOptions) {
        return _this3.fetch(getBaseURL(host) + path, fetchOptions);
      }).then(function (res) {
        return parseResponse(res);
      });
    }
  }, {
    key: "setCommonHeaders",
    value: function setCommonHeaders(options) {
      if (this.selectUser) {
        options.headers['Dropbox-API-Select-User'] = this.selectUser;
      }

      if (this.selectAdmin) {
        options.headers['Dropbox-API-Select-Admin'] = this.selectAdmin;
      }

      if (this.pathRoot) {
        options.headers['Dropbox-API-Path-Root'] = this.pathRoot;
      }
    }
  }]);

  return Dropbox;
}();

export { Dropbox as default };