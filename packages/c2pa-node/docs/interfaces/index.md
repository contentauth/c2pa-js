# Interfaces

{%- assign interfaces_root = site.baseurl | append: '/interfaces/' -%}
{%- assign interfaces_pages = site.pages | where_exp: 'p', "p.url contains '/interfaces/'" -%}
{%- assign interfaces_pages = interfaces_pages | reject: 'url', interfaces_root -%}
{% assign interfaces_pages = interfaces_pages | sort: 'name' %}

{% if interfaces_pages and interfaces_pages.size > 0 %}
{%- for p in interfaces_pages -%}
{% assign label = p.name | replace: '.md','' | replace: '.html','' %}
{%- unless p.name=="index.md" %}
- <a href="{{ p.url | relative_url }}">{{ label }}</a> 
{%- endunless -%}
{%- endfor -%}
{%- else -%}
No interfaces found.
{%- endif -%}
