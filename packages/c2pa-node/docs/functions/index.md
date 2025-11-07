# Functions

{%- assign functions_root = site.baseurl | append: '/functions/' -%}
{%- assign functions_pages = site.pages | where_exp: 'p', "p.url contains '/functions/'" -%}
{%- assign functions_pages = functions_pages | reject: 'url', functions_root -%}
{% assign functions_pages = functions_pages | sort: 'name' %}

{% if functions_pages and functions_pages.size > 0 %}
{%- for p in functions_pages -%}
{% assign label = p.name | replace: '.md','' | replace: '.html','' %}
{%- unless p.name=="index.md" %}
- <a href="{{ p.url | relative_url }}">{{ label }}</a> 
{%- endunless -%}
{%- endfor -%}
{%- else -%}
No functions found.
{%- endif -%}
