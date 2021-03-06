'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var DATE_REGEXP = /^([А-Я]{2})\s?(\d{2}):(\d{2})\+(\d+)$/;
var TIME_REGEXP = /^(\d{2}):(\d{2})\+(\d+)$/;
var WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ'];
var MINS_IN_HOUR = 60;
var HOURS_IN_DAY = 24;
var MSCESC_IN_SEC = 1000;
var SECS_IN_MIN = 60;
var SHIFT = 30;
var DAYS_NUMBER = 3;

var DateTime = function (time) {
    if (typeof time === 'string') {
        var parsed = time.match(DATE_REGEXP);
        var weekDay = WEEKDAYS.indexOf(parsed[1]);
        var hours = Number(parsed[2]);
        var minutes = Number(parsed[3]);
        var timeZone = Number(parsed[4]) % HOURS_IN_DAY;
        this._date = new Date(Date.UTC(2016, 9, 24, 0, 0, 0, 0));
        this._timezone = 0;
        this.timezone = timeZone;
        this.addHours(hours - timeZone);
        this.addDays(weekDay);
        this.addMinutes(minutes);
    } else {
        this._date = new Date(time._date);
        this._timezone = time._timezone;
    }

};

Object.defineProperties(DateTime.prototype, {

    addHours: {
        value: function (hours) {
            this._date.setUTCHours(this._date.getUTCHours() + hours);
        }
    },

    addDays: {
        value: function (days) {
            this._date.setUTCDate(this._date.getUTCDate() + days);
        }
    },

    addMinutes: {
        value: function (minutes) {
            this._date.setUTCMinutes(this._date.getUTCMinutes() + minutes);
        }
    },

    minutes: {
        get: function () {

            return this._date.getUTCMinutes();
        },

        set: function (value) {
            this._date.setUTCMinutes(value);
        }

    },

    hours: {
        get: function () {

            return this._date.getUTCHours();
        },

        set: function (value) {
            this._date.setUTCHours(value);
        }

    },

    dayOfWeek: {
        value: function () {

            return WEEKDAYS[this._date.getUTCDay() - 1];
        }
    },

    timezone: {
        get: function () {

            return this._timezone;
        },

        set: function (value) {
            this.addHours(Number(value) - this._timezone);
            this._timezone = value;
        }

    },

    date: {
        value: function () {
            return this._date;
        }
    }
});

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, '10:00+5'
 * @param {String} workingHours.to – Время закрытия, например, '18:00+5'
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {

    return {
        _bankTimeZone: Number(workingHours.from.match(TIME_REGEXP)[3]) % HOURS_IN_DAY,
        _bankFrom: workingHours.from.match(TIME_REGEXP).splice(1, 2),
        _bankTo: workingHours.to.match(TIME_REGEXP).splice(1, 2),
        _duration: duration,
        _datedSchedule: {},
        _fromBankMins: undefined,
        _toBankMins: undefined,
        _beginTime: undefined,
        _shift: 0,
        _freeSpace: undefined,
        _robberyTimes: [],
        _monday: undefined,

        _fillScheduleForName: function (name) {
            var strDates = schedule[name];
            var dates = [];
            for (var dateIndex = 0; dateIndex < strDates.length; dateIndex++) {
                var fromDate = new DateTime(strDates[dateIndex].from);
                var toDate = new DateTime(strDates[dateIndex].to);
                fromDate.timezone = this._bankTimeZone;
                toDate.timezone = this._bankTimeZone;
                if (!fromDate || !toDate) {
                    continue;
                }
                if (fromDate.date() > toDate.date()) {
                    continue;
                }
                dates.push({
                    'from': fromDate,
                    'to': toDate
                });
            }
            this._datedSchedule[name] = dates;
        },

        _prepareSchedule: function () {
            this._fromBankMins = Number(this._bankFrom[0]) *
             MINS_IN_HOUR + Number(this._bankFrom[1]);
            this._toBankMins = Number(this._bankTo[0]) *
             MINS_IN_HOUR + Number(this._bankTo[1]);
            this._datedSchedule = {};
            for (var name in schedule) {
                if (!name) {
                    continue;
                }
                this._fillScheduleForName(name);
            }

        },

        _prepareFreeSpace: function () {
            this._monday = new DateTime('ПН 00:00+' + String(this._bankTimeZone));
            this._freeSpace = {
                'from': new DateTime(this._monday),
                'to': new DateTime(this._monday)
            };
            this._freeSpace.to.addDays(3);
            this._freeSpace = [this._freeSpace];
        },

        _getDatesIntersection: function (intervals) {
            var intersected = {
                'from': intervals[0].from,
                'to': intervals[0].to
            };
            for (var i = 1; i < intervals.length; i++) {
                var interval = intervals[i];
                if (interval.to.date() <= intersected.from.date() ||
                 interval.from.date() >= intersected.to.date()) {

                    return;
                }

                if (interval.from.date() > intersected.from.date()) {
                    intersected.from = new DateTime(interval.from);
                }
                if (interval.to.date() < intersected.to.date()) {
                    intersected.to = new DateTime(interval.to);
                }
            }

            return intersected;
        },

        _isApropForRobery: function (interval) {
            var freeDuration = (interval.to.date() - interval.from.date());
            if (freeDuration >= duration * SECS_IN_MIN * MSCESC_IN_SEC) {

                return true;
            }

            return false;
        },

        _correctFreeSpace: function (busyInterval) {
            for (var spaceIndex = 0; spaceIndex < this._freeSpace.length; spaceIndex += 1) {
                var interval = this._freeSpace[spaceIndex];
                var intersection = this._getDatesIntersection([
                    interval,
                    busyInterval
                ]);

                if (!intersection) {
                    continue;
                }

                if (intersection.to.date() < interval.to.date()) {
                    var afterInterval = {
                        'from': intersection.to,
                        'to': interval.to
                    };

                    this._freeSpace.splice(spaceIndex + 1, 0, afterInterval);

                }
                this._freeSpace.splice(spaceIndex, 1);
                if (interval.from.date() < intersection.from.date()) {
                    var beforeInterval = {
                        'from': interval.from,
                        'to': intersection.from
                    };

                    this._freeSpace.splice(spaceIndex, 0, beforeInterval);

                }
                spaceIndex -= 1;
            }
        },

        _bankBusyCorrect: function () {
            var dayBegin = new DateTime(this._monday);
            var bankFrom = new DateTime(this._monday);
            var dayEnd = new DateTime(this._monday);
            var bankTo = new DateTime(this._monday);
            dayEnd.addDays(1);
            bankFrom.addMinutes(this._fromBankMins);
            bankTo.addMinutes(this._toBankMins);
            for (var dayIndex = 0; dayIndex < 3; dayIndex++) {
                this._correctFreeSpace({ 'from': dayBegin, 'to': bankFrom });
                this._correctFreeSpace({ 'from': bankTo, 'to': dayEnd });
                bankFrom.addDays(1);
                bankTo.addDays(1);
                dayBegin.addDays(1);
                dayEnd.addDays(1);
            }
        },

        _findRoberyTimes: function () {
            this._prepareFreeSpace();
            this._prepareSchedule();
            var names = Object.keys(this._datedSchedule);
            names.forEach(function (name) {
                for (var busyIndex = 0;
                    busyIndex < this._datedSchedule[name].length; busyIndex++) {
                    this._correctFreeSpace(this._datedSchedule[name][busyIndex]);
                }
            }.bind(this));
            this._bankBusyCorrect();
            this._robberyTimes = [];
            for (var i = 0; i < this._freeSpace.length; i++) {
                var interval = this._freeSpace[i];
                if (this._isApropForRobery(interval)) {
                    this._robberyTimes.push(interval);
                }
            }
        },

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            this._findRoberyTimes();
            if (this._robberyTimes.length) {
                this._beginTime = this._robberyTimes[0];

                return true;
            }

            return false;
        },

        _getShiftedDate: function () {
            var date = new DateTime(this._beginTime.from);
            date.addMinutes(this._shift);

            return date;
        },

        _twoDigits: function (text) {

            return ('0' + text).slice(-2);
        },

        _getFormattedDate: function (date, format) {
            var hours = date.hours;
            var minutes = date.minutes;
            hours = this._twoDigits(hours);
            minutes = this._twoDigits(minutes);

            return format
                .replace(/%DD/g, date.dayOfWeek())
                .replace(/%MM/g, minutes)
                .replace(/%HH/g, hours);
        },


       /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   'Начинаем в %HH:%MM (%DD)' -> 'Начинаем в 14:59 (СР)'
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!this._beginTime) {
                this.exists();
            }
            if (template && this._beginTime && typeof template === 'string') {
                var shiftedBegin = this._getShiftedDate();

                return this._getFormattedDate(shiftedBegin, template);
            }

            return '';
        },

        _tryShifted: function () {
            var shiftedDate = this._getShiftedDate();
            for (var i = 0; i < this._robberyTimes.length; i++) {
                var interval = this._robberyTimes[i];
                if (shiftedDate.date() < interval.from.date() ||
                    shiftedDate.date() >= interval.to.date()) {
                    continue;
                }
                var newInterval = {
                    'from': shiftedDate,
                    'to': interval.to
                };
                if (this._isApropForRobery(newInterval)) {

                    return true;
                }
            }

            return false;
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            if (!this._beginTime) {
                this.exists();
            }
            if (!this._beginTime) {

                return false;
            }

            var lastShift = this._shift;
            for (var shift = lastShift + SHIFT; shift < MINS_IN_HOUR *
                HOURS_IN_DAY * DAYS_NUMBER; shift += SHIFT) {
                this._shift = shift;
                if (this._tryShifted()) {

                    return true;
                }
            }
            this._shift = lastShift;

            return false;
        }
    };
};
