[**@contentauth/c2pa-node**](../README.md)

***

[@contentauth/c2pa-node](../README.md) / loadSettingsFromUrl

# Function: loadSettingsFromUrl()

> **loadSettingsFromUrl**(`url`): `Promise`\<`void`\>

Defined in: [Settings.ts:58](https://github.com/contentauth/c2pa-node-v2/blob/5fc86ffc8659a51143dea77869309236a097edcc/js-src/Settings.ts#L58)

Load settings from a URL and apply them globally.
The format is determined by the content-type header or file extension (.toml for TOML, otherwise JSON).

## Parameters

### url

`string`

The URL to fetch the settings from

## Returns

`Promise`\<`void`\>
