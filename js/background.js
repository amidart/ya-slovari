/**
 * Original extension (seems it's no more supported):
 * https://chrome.google.com/webstore/detail/%D1%8F%D0%BD%D0%B4%D0%B5%D0%BA%D1%81-%D1%81%D0%BB%D0%BE%D0%B2%D0%B0%D1%80%D0%B8/kkgkpooheofknojcfhkfajngigacoghh
 *
 * This is almost the same extension.
 * Changes:
 *   - migrated to Manifest v2
 *   - fixed Yandex urls
 *   - creates new tab instead of update current
 */

Function.prototype.bind = function(scope)
{
    var func = this;
    return function()
    {
        return func.apply(scope, arguments);
    };
};


/**
 * YandexDictionary Class
 */
var YandexDictionary = new function()
{
    this.SUGGESTION_URL = 'http://suggest-slovari.yandex.ru/suggest-lingvo?v=2&lang=&part=';
    this.BASE_URL = 'http://slovari.yandex.ru';
    this.SEARCH_URL = this.BASE_URL + '/';

    this.fetchSuggestionsFor = function( text, callback )
    {
        var request = new XMLHttpRequest();
        request.addEventListener('readystatechange',
            function(event)
            {
                if (request.readyState == 4 && request.status == 200)
                {
                    var json = JSON.parse(request.responseText);
                    callback(YandexDictionary.parseSuggestions(json));
                }
            });
        request.open('GET', this.SUGGESTION_URL + Url.encode(text), true);
        request.send();
    };

    this.parseSuggestions = function( json )
    {
        var suggestions = json[1];
        if (suggestions.length === 0)
            return [];
        var urls = json[2];
        var result = [];
        for (var i = 0; i < suggestions.length; ++i)
            result.push({'description': suggestions[i], 'url': this.replaceUrl(urls[i])});
        return result;
    };

    this.replaceUrl = function( suggestUrl )
    {
        var found = suggestUrl.match(/text=(.*?)\&/);
        if (found)
            return this.makeUrl(found[1]);
        else
            return this.SEARCH_URL;
    };

    this.makeUrl = function( text )
    {
        return this.SEARCH_URL + text + '/перевод/';
    };
};


/**
 * OmniBox Class
 */
var OmniBox = new function()
{
    this.PLUGIN_LOGO_TEXT = 'Искать в Яндекс.Словарях';
    this.PLUGIN_LOGO_TEXT2 = 'Искать %s в Яндекс.Словарях';
    this.yandexSuggestions = null;

    this.setDefaultSuggestion = function( text )
    {
        var descr = (text ? this.PLUGIN_LOGO_TEXT2 : this.PLUGIN_LOGO_TEXT);
        chrome.omnibox.setDefaultSuggestion({'description': descr});
    };
    this.updateSuggestion = function( text, suggest )
    {
        this.setDefaultSuggestion(text);
        YandexDictionary.fetchSuggestionsFor(text,
            function( yandexSuggestions )
            {
                this.yandexSuggestions = yandexSuggestions;
                suggestions = [];
                for (var i = 0; i < yandexSuggestions.length; ++i)
                    suggestions.push({'content': yandexSuggestions[i].description,
                        'description': '<dim>' + yandexSuggestions[i].description + '</dim>'});
                suggest(suggestions);
            }.bind(this));
    };
    this.openSuggestionPage = function( text )
    {
        for (var i = 0; i < this.yandexSuggestions.length; ++i)
        {
            var suggestion = this.yandexSuggestions[i];
            if (text == suggestion.description)
            {
                chrome.tabs.getSelected(null,
                    function( tab )
                    {
                        chrome.tabs.create({'url': suggestion.url, index: tab.index});
                    });
                return;
            }
        }
        chrome.tabs.getSelected(null,
            function( tab )
            {
                chrome.tabs.create({'url': YandexDictionary.makeUrl(text), index: tab.index});
            });
    };

    chrome.omnibox.onInputStarted.addListener(this.setDefaultSuggestion.bind(this));
    chrome.omnibox.onInputCancelled.addListener(this.setDefaultSuggestion.bind(this));
    chrome.omnibox.onInputChanged.addListener(this.updateSuggestion.bind(this));
    chrome.omnibox.onInputEntered.addListener(this.openSuggestionPage.bind(this));
    this.setDefaultSuggestion(null);
};
