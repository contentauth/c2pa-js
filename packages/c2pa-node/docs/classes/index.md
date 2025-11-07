# Classes

{%- assign classes_root = site.baseurl | append: '/classes/' -%}
{%- assign class_pages = site.pages | where_exp: 'p', "p.url contains '/classes/'" -%}
{%- assign class_pages = class_pages | reject: 'url', classes_root -%}
{% assign class_pages = class_pages | sort: 'name' %}

{% if class_pages and class_pages.size > 0 %}
{%- for p in class_pages -%}
{% assign label = p.name | replace: '.md','' | replace: '.html','' %}
{%- unless p.name=="index.md" %}
- <a href="{{ p.url | relative_url }}">{{ label }}</a> 
{%- endunless -%}
{%- endfor -%}
{%- else -%}
No classes found.
{%- endif -%}