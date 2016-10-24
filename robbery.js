'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, '10:00+5'
 * @param {String} workingHours.to – Время закрытия, например, '18:00+5'
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    console.info(schedule, duration, workingHours);

    return {
        _bankTimeZone: Number(workingHours.from.match(/.*\+(\d+)/)[1]) % 24,
        _bankFrom: workingHours.from.match(/(\d+):(\d+)\+(\d)/).splice(1, 2),
        _bankTo: workingHours.to.match(/(\d+):(\d+)\+(\d)/).splice(1, 2),
        _duration: duration,
        _datedSchedule: {},
        _fromBankMins: undefined,
        _toBankMins: undefined,
        _beginTime: undefined,
        _shift: 0,
        _today: new Date(),
        _freeSpace: undefined,
        _robberyTimes: [],
        _weekDays: 'ПН;ВТ;СР;ЧТ;ПТ;СБ;ВС'.split(';'),
        _strDateToDate: function (strDate) {

            var today = this._today;
            var parsed = strDate.match(/([А-Я]{2})\s(\d+):(\d+)\+(\d)/);
            var weekDay = this._weekDays.indexOf(parsed[1]);
            var hours = Number(parsed[2]);
            var minutes = Number(parsed[3]);
            var timeZone = Number(parsed[4]);
            var dayNum = today.getDay();
            var date = new Date(today);
            date.setUTCHours(hours - timeZone);
            date.setUTCDate(today.getDate() - (dayNum - weekDay - 1));
            date.setUTCMinutes(minutes);
            if (weekDay >= 3) {

                return undefined;
            }

            return date;
        },

        _fillScheduleForName: function (name) {
            var strDates = schedule[name];
            var dates = [];
            for (var dateIndex = 0; dateIndex < strDates.length; dateIndex++) {
                var fromDate = this._strDateToDate(strDates[dateIndex].from);
                var toDate = this._strDateToDate(strDates[dateIndex].to);
                if (!fromDate || !toDate) {
                    continue;
                }
                if (fromDate > toDate) {
                    // dates.push({
                        // 'from': fromDate,
                        // 'to': new Date(this._freeSpace[this._freeSpace.length - 1].to)
                    // });
                    // fromDate = new Date(this._freeSpace[0].from);
                    continue;
                    // var tmp = fromDate;
                    // fromDate = toDate;
                    // toDate = tmp;
                }
                dates.push({
                    'from': fromDate,
                    'to': toDate
                });
            }
            this._datedSchedule[name] = dates;
        },

        _prepareSchedule: function () {

            this._fromBankMins = Number(this._bankFrom[0]) * 60 + Number(this._bankFrom[1]);
            this._toBankMins = Number(this._bankTo[0]) * 60 + Number(this._bankTo[1]);
            this._datedSchedule = {};
            for (var name in schedule) {
                if (!name) {
                    continue;
                }
                this._fillScheduleForName(name);
            }
        },

        _prepareFreeSpace: function () {
            this._today = new Date();
            this._today.setUTCHours(-this._bankTimeZone);
            this._today.setUTCMinutes(0);
            this._today.setUTCSeconds(0);
            this._today.setUTCMilliseconds(0);
            this._freeSpace = {
                'from': new Date(this._today),
                'to': new Date(this._today)
            };
            var from = this._freeSpace.from;
            from.setUTCDate(from.getUTCDate() - from.getUTCDay() + 1);
            from.setUTCHours(-this._bankTimeZone);
            var to = this._freeSpace.to;
            to.setUTCDate(from.getDate() + 3);
            to.setUTCHours(24 - this._bankTimeZone);
            this._freeSpace = [this._freeSpace];


        },

        _getDatesIntersection: function (intervals) {
            var intersected = {
                'from': intervals[0].from,
                'to': intervals[0].to
            };
            for (var i = 1; i < intervals.length; i++) {
                var interval = intervals[i];
                if (interval.to < intersected.from || interval.from > intersected.to) {

                    return undefined;
                }

                if (interval.from > intersected.from) {

                    intersected.from = interval.from;
                }
                if (interval.to < intersected.to) {
                    intersected.to = interval.to;
                }
            }

            return intersected;
        },

        _isApropForRobery: function (interval) {
            // console.log(interval);
            // var index = interval.from.getUTCDay();
            // index += Math.floor((interval.from.getUTCHours() + this._bankTimeZone) / 24);
            // if (index > 3) {

            //     return false;
            // }

            var fromFreeMins = (interval.from.getUTCHours() +
                this._bankTimeZone) % 24 * 60 + interval.from.getUTCMinutes();
            var toFreeMins = (interval.to.getUTCHours() +
                this._bankTimeZone) % 24 * 60 + interval.to.getUTCMinutes();
            // console.log(interval, fromFreeMins, toFreeMins, this._fromBankMins, this._toBankMins)
            if (fromFreeMins + duration > this._toBankMins) {
                return false;
            }
            if (this._fromBankMins <= fromFreeMins && this._toBankMins >= toFreeMins) {
                var freeDuration = Math.round((interval.to - interval.from) / (1000 * 60));
                if (freeDuration >= duration) {

                    return true;
                }
            }
            // console.log(this._fromBankMins, fromFreeMins, this._toBankMins, toFreeMins);

            return false;
        },

        _correctFreeSpace: function (busyInterval) {

            // console.log(busyInterval)
            for (var spaceIndex = 0; spaceIndex < this._freeSpace.length; spaceIndex += 1) {
                var interval = this._freeSpace[spaceIndex];
                var intersection = this._getDatesIntersection([
                    interval,
                    busyInterval
                ]);

                if (!intersection) {
                    continue;
                }

                if (intersection.to < interval.to) {
                    var afterInterval = {
                        'from': intersection.to,
                        'to': interval.to
                    };

                    this._freeSpace.splice(spaceIndex + 1, 0, afterInterval);

                }
                this._freeSpace.splice(spaceIndex, 1);
                if (interval.from < intersection.from) {
                    var beforeInterval = {
                        'from': interval.from,
                        'to': intersection.from
                    };

                    this._freeSpace.splice(spaceIndex, 0, beforeInterval);
                }
                // console.log(this._freeSpace, "corrected")
                // console.log(interval, busyInterval, spaceIndex);
                // console.log("\n")
            }
        },

        _getNextDate: function (date) {
            var nextDate = new Date(date);
            nextDate.setUTCDate(nextDate.getUTCDate() + 1);

            return nextDate;
        },

        _bankBusyCorrect: function () {
            var dayBegin = new Date(this._today);
            dayBegin.setUTCDate(dayBegin.getUTCDate() - dayBegin.getUTCDay());
            var bankFrom = new Date(dayBegin);
            var dayEnd = this._getNextDate(dayBegin);
            var bankTo = new Date(dayBegin);
            bankFrom.setUTCMinutes(this._fromBankMins);
            bankTo.setUTCMinutes(this._toBankMins);
            // console.log(dayBegin, dayEnd, bankFrom, bankTo)
            for (var dayIndex = 0; dayIndex < 3; dayIndex++) {
                this._correctFreeSpace({ 'from': dayBegin, 'to': bankFrom });
                this._correctFreeSpace({ 'from': bankTo, 'to': dayEnd });
                bankFrom = this._getNextDate(bankFrom);
                bankTo = this._getNextDate(bankTo);
                dayBegin = this._getNextDate(dayBegin);
                dayEnd = this._getNextDate(dayEnd);
            }
        },

        _findRoberyTimes: function () {
            this._prepareFreeSpace();
            this._prepareSchedule();
            var names = Object.keys(this._datedSchedule);
            if (names.length !== 3) {

                return;
            }

            for (var nameIndex = 0; nameIndex < names.length; nameIndex++) {
                var name = names[nameIndex];

                for (var busyIndex = 0; busyIndex < this._datedSchedule[name].length; busyIndex++) {
                    this._correctFreeSpace(this._datedSchedule[name][busyIndex]);
                }
            }
            // console.log(this._freeSpace);
            // console.log("\n");
            this._bankBusyCorrect();
            // console.log(this._freeSpace);
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
            // console.log(this._freeSpace);
            if (this._robberyTimes.length) {
                this._beginTime = this._robberyTimes[0];

                return true;
            }

            return false;
        },

        _getShiftedDate: function () {
            var date = new Date(this._beginTime.from);
            date.setUTCMinutes(this._beginTime.from.getUTCMinutes() + this._shift);

            return date;
        },

        _getFormattedDate: function (date, format) {
            var weekDays = 'ПН;ВТ;СР;ЧТ;ПТ;СБ;ВС'.split(';');

            var index = date.getUTCDay() - 1;
            index += Math.floor((date.getUTCHours() + this._bankTimeZone) / 24);

            var hours = String((date.getUTCHours() + this._bankTimeZone) % 24);
            var minutes = String(date.getUTCMinutes());
            hours = ('0' + hours).slice(-2);
            minutes = ('0' + minutes).slice(-2);
            var result = format.replace(/%DD/g, weekDays[index]);
            result = result.replace(/%MM/g, minutes);
            result = result.replace(/%HH/g, hours);

            return result;
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
            if (template && this._beginTime && typeof(template) === 'string') {

                var shiftedBegin = this._getShiftedDate();

                return this._getFormattedDate(shiftedBegin, template);
            }


            return '';
        },

        _tryShifted: function () {
            var shiftedDate = this._getShiftedDate();
            for (var i = 0; i < this._robberyTimes.length; i++) {
                var interval = this._robberyTimes[i];
                if (shiftedDate < interval.from || shiftedDate > interval.to) {
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
            for (var shift = lastShift + 30; shift < 144 * 30; shift += 30) {
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
