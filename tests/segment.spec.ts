import { h, escape, unescape, parse, text, select } from '../src/index.ts'
import { describe, test } from 'node:test'
import { expect, use } from 'chai'
import shape from 'chai-shape'

use(shape)

describe('Element API', () => {
  test('escape()', () => {
    expect(escape('<foo>')).to.equal('&lt;foo&gt;')
    expect(escape('&quot;')).to.equal('&amp;quot;')
  })

  test('unescape()', () => {
    expect(unescape('&lt;foo&gt;')).to.equal('<foo>')
    expect(unescape('&amp;quot;')).to.equal('&quot;')
  })

  describe('parse()', () => {
    test('basic support', () => {
      expect(parse('<img src="https://test.com/?foo=1&amp;bar=2"/>'))
        .to.deep.equal([h('img', { src: 'https://test.com/?foo=1&bar=2' })])
      expect(parse(`<tag foo="'" bar='"'>text</tag>`))
        .to.deep.equal([h('tag', { foo: "'", bar: '"' }, 'text')])
      expect(parse('<tag no-foo bar-qux>text</tag>'))
        .to.deep.equal([h('tag', { foo: false, barQux: true }, 'text')])
    })

    test('mismatched tags', () => {
      expect(parse('1<foo>2<bar attr>3').join('')).to.equal('1<foo>2<bar attr>3</bar></foo>')
      expect(parse('1<foo/>4').join('')).to.equal('1<foo/>4')
      expect(parse('1</foo>4').join('')).to.equal('14')
    })

    test('whitespace', () => {
      expect(parse(`<>
        <foo> 1 </foo>
        <!-- comment -->
        2
      </>`).join('')).to.equal('<><foo> 1 </foo>2</>')
    })
  })

  describe('Interpolation', () => {
    test('interpolate', () => {
      expect(parse('<tag bar={bar}>1{foo}1</tag>', { foo: 233, bar: 666 }))
        .to.deep.equal([h('tag', { bar: 666 }, '1', '233', '1')])
      expect(parse('<tag>&gt;{"&gt;"}</tag>', {}))
        .to.deep.equal([h('tag', '>', '&gt;')])
      expect(parse('<tag>{0}{1+1}</tag>', [233, 666]))
        .to.deep.equal([h('tag', '233', '2')])
    })

    test('control flow', () => {
      expect(parse('{#if foo >= 0}{foo}{:else}<p>negative</p>{/if}', { foo: 233 }))
        .to.deep.equal([text('233')])
      expect(parse('{#if foo >= 0}{foo}{:else}<p>negative</p>{/if}', { foo: -233 }))
        .to.deep.equal([h('p', 'negative')])
    })

    test('#each', () => {
      expect(parse('{#each arr as i}{i ** 2}{/each}', { arr: [1, 2, 3] }))
        .to.deep.equal([text('1'), text('4'), text('9')])
    })
  })

  describe('toString()', () => {
    test('basic support', () => {
      expect(h('img', { src: 'https://test.com/?foo=1&bar=2' }).toString())
        .to.equal('<img src="https://test.com/?foo=1&amp;bar=2"/>')
      expect(h('tag', { foo: false, barQux: true }, 'text').toString())
        .to.equal('<tag no-foo bar-qux>text</tag>')
      expect(h('template', parse('<tag foo>&lt;bar&gt;</tag>')).toString(true)).to.equal('<bar>')
    })

    test('validate children', () => {
      expect(() => h('tag', {}, {} as any)).to.throw()
      expect(h('tag', ['123', null, h('span', '456')]).toString())
        .to.equal('<tag>123<span>456</span></tag>')
      expect(h('tag', { children: '789' }).toString())
        .to.equal('<tag>789</tag>')
    })
  })

  describe('Selectors', () => {
    const selectIds = (source: string, query: string) => select(source, query).map(el => el.attrs.id)

    test('type selector', () => {
      expect(selectIds('<a id="1"><a id="2"></a></a>', 'a')).to.deep.equal(['1', '2'])
      expect(selectIds('<a id="1"><b id="2"></b></a>', 'b')).to.deep.equal(['2'])
      expect(selectIds('<a id="1"><b id="2"></b></a>', 'c')).to.deep.equal([])
    })

    test('descendant', () => {
      expect(selectIds('<a id="1"><b id="2"><c id="3"></c></b></a>', 'b>c')).to.deep.equal(['3'])
      expect(selectIds('<a id="1"><b id="2"><c id="3"></c></b></a>', 'a c')).to.deep.equal(['3'])
      expect(selectIds('<a id="1"><b id="2"><c id="3"></c></b></a>', 'a>c')).to.deep.equal([])
      expect(selectIds('<a id="1"><b id="2"></b><c id="3"></c></a>', 'b c')).to.deep.equal([])
      expect(selectIds('<a id="1"><b id="2"></b><c id="3"></c></a>', 'a>c')).to.deep.equal(['3'])
    })

    test('sibling', () => {
      expect(selectIds('<a id="2"></a><b id="3"></b><b id="4"></b>', 'a+b')).to.deep.equal(['3'])
      expect(selectIds('<a id="2"></a><b id="3"></b><b id="4"></b>', 'a~b')).to.deep.equal(['3', '4'])
    })
  })
})
