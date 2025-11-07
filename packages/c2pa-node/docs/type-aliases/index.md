# Type Aliases

{%- assign type_aliases_root = site.baseurl | append: '/type-aliases/' -%}
{%- assign type_aliases_pages = site.pages | where_exp: 'p', "p.url contains '/type-aliases/'" -%}
{%- assign type_aliases_pages = type_aliases_pages | reject: 'url', type_aliaseses_root -%}
{% assign type_aliases_pages = type_aliases_pages | sort: 'name' %}

{% if type_aliases_pages and type_aliases_pages.size > 0 %}
{%- for p in type_aliases_pages -%}
{% assign label = p.name | replace: '.md','' | replace: '.html','' %}
{%- unless p.name=="index.md" %}
- <a href="{{ p.url | relative_url }}">{{ label }}</a> 
{%- endunless -%}
{%- endfor -%}
{%- else -%}
No type aliases found.
{%- endif -%}
