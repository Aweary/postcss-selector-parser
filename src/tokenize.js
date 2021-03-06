let singleQuote  = "'".charCodeAt(0),
    doubleQuote  = '"'.charCodeAt(0),
    backslash    = '\\'.charCodeAt(0),
    slash        = '/'.charCodeAt(0),
    newline      = '\n'.charCodeAt(0),
    space        = ' '.charCodeAt(0),
    feed         = '\f'.charCodeAt(0),
    tab          = '\t'.charCodeAt(0),
    cr           = '\r'.charCodeAt(0),
    plus         = '+'.charCodeAt(0),
    gt           = '>'.charCodeAt(0),
    tilde        = '~'.charCodeAt(0),
    pipe         = '|'.charCodeAt(0),
    comma        = ','.charCodeAt(0),
    openBracket  = '('.charCodeAt(0),
    closeBracket = ')'.charCodeAt(0),
    openSq       = '['.charCodeAt(0),
    closeSq      = ']'.charCodeAt(0),
    semicolon    = ';'.charCodeAt(0),
    asterisk     = '*'.charCodeAt(0),
    colon        = ':'.charCodeAt(0),
    ampersand    = '&'.charCodeAt(0),
    at           = '@'.charCodeAt(0),
    atEnd        = /[ \n\t\r\{\(\)'"\\;/]/g,
    wordEnd      = /[ \n\t\r\(\)\*:;@!&'"\+\|~>,\[\]\\]|\/(?=\*)/g;

export default function tokenize (input) {
    let tokens = [];
    let css    = input.css.valueOf();

    let code, next, quote, lines, last, content, escape,
        nextLine, nextOffset, escaped, escapePos;

    let length = css.length;
    let offset = -1;
    let line   =  1;
    let pos    =  0;

    let unclosed = function (what, end) {
        if ( input.safe ) {
            css += end;
            next = css.length - 1;
        } else {
            throw input.error('Unclosed ' + what, line, pos - offset, pos);
        }
    };

    while ( pos < length ) {
        code = css.charCodeAt(pos);

        if ( code === newline ) {
            offset = pos;
            line  += 1;
        }

        switch ( code ) {
        case newline:
        case space:
        case tab:
        case cr:
        case feed:
            next = pos;
            do {
                next += 1;
                code = css.charCodeAt(next);
                if ( code === newline ) {
                    offset = next;
                    line  += 1;
                }
            } while ( code === space   ||
                      code === newline ||
                      code === tab     ||
                      code === cr      ||
                      code === feed );

            tokens.push(['space', css.slice(pos, next), line, pos - offset, pos]);
            pos = next - 1;
            break;

        case plus:
        case gt:
        case tilde:
        case pipe:
            next = pos;
            do {
                next += 1;
                code = css.charCodeAt(next);
            } while ( code === plus  ||
                      code === gt    ||
                      code === tilde ||
                      code === pipe );
            tokens.push(['combinator', css.slice(pos, next), line, pos - offset, pos]);
            pos = next - 1;
            break;

        case asterisk:
            tokens.push(['*', '*', line, pos - offset, pos]);
            break;
        
        case ampersand:
            tokens.push(['&', '&', line, pos - offset, pos]);
            break;

        case comma:
            tokens.push([',', ',', line, pos - offset, pos]);
            break;

        case openSq:
            tokens.push(['[', '[', line, pos - offset, pos]);
            break;

        case closeSq:
            tokens.push([']', ']', line, pos - offset, pos]);
            break;

        case colon:
            tokens.push([':', ':', line, pos - offset, pos]);
            break;

        case semicolon:
            tokens.push([';', ';', line, pos - offset, pos]);
            break;

        case openBracket:
            tokens.push(['(', '(', line, pos - offset, pos]);
            break;

        case closeBracket:
            tokens.push([')', ')', line, pos - offset, pos]);
            break;

        case singleQuote:
        case doubleQuote:
            quote = code === singleQuote ? "'" : '"';
            next  = pos;
            do {
                escaped = false;
                next    = css.indexOf(quote, next + 1);
                if ( next === -1 ) {
                    unclosed('quote', quote);
                }
                escapePos = next;
                while ( css.charCodeAt(escapePos - 1) === backslash ) {
                    escapePos -= 1;
                    escaped = !escaped;
                }
            } while ( escaped );

            tokens.push(['string', css.slice(pos, next + 1),
                line, pos  - offset,
                line, next - offset,
                pos
            ]);
            pos = next;
            break;

        case at:
            atEnd.lastIndex = pos + 1;
            atEnd.test(css);
            if ( atEnd.lastIndex === 0 ) {
                next = css.length - 1;
            } else {
                next = atEnd.lastIndex - 2;
            }
            tokens.push(['at-word', css.slice(pos, next + 1),
                line, pos  - offset,
                line, next - offset,
                pos
            ]);
            pos = next;
            break;

        case backslash:
            next   = pos;
            escape = true;
            while ( css.charCodeAt(next + 1) === backslash ) {
                next  += 1;
                escape = !escape;
            }
            code = css.charCodeAt(next + 1);
            if ( escape && (code !== slash   &&
                            code !== space   &&
                            code !== newline &&
                            code !== tab     &&
                            code !== cr      &&
                            code !== feed ) ) {
                next += 1;
            }
            tokens.push(['word', css.slice(pos, next + 1),
                line, pos  - offset,
                line, next - offset,
                pos
            ]);
            pos = next;
            break;

        default:
            if ( code === slash && css.charCodeAt(pos + 1) === asterisk ) {
                next = css.indexOf('*/', pos + 2) + 1;
                if ( next === 0 ) {
                    unclosed('comment', '*/');
                }

                content = css.slice(pos, next + 1);
                lines   = content.split('\n');
                last    = lines.length - 1;

                if ( last > 0 ) {
                    nextLine   = line + last;
                    nextOffset = next - lines[last].length;
                } else {
                    nextLine   = line;
                    nextOffset = offset;
                }

                tokens.push(['comment', content,
                    line,     pos  - offset,
                    nextLine, next - nextOffset,
                    pos
                ]);

                offset = nextOffset;
                line   = nextLine;
                pos    = next;

            } else {
                wordEnd.lastIndex = pos + 1;
                wordEnd.test(css);
                if ( wordEnd.lastIndex === 0 ) {
                    next = css.length - 1;
                } else {
                    next = wordEnd.lastIndex - 2;
                }

                tokens.push(['word', css.slice(pos, next + 1),
                    line, pos  - offset,
                    line, next - offset,
                    pos
                ]);
                pos = next;
            }

            break;
        }

        pos++;
    }

    return tokens;
}
