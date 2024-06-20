# main/templatetags/custom_filters.py
from django import template
import datetime

register = template.Library()


@register.filter(name='format_date')
def format_date(value, date_format="%d.%m.%Y %H:%M"):
    if isinstance(value, datetime.datetime):
        return value.strftime(date_format)
    if isinstance(value, str):
        try:
            dt_value = datetime.datetime.fromisoformat(value)
            return dt_value.strftime(date_format)
        except ValueError:
            return value
    return value
