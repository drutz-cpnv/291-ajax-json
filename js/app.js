class SearchInput {

    AUTOCOMPLETION_ENDPOINT = "https://timetable.search.ch/api/completion.fr.json?term="

    /**
     *
     * @param {HTMLInputElement} input
     * @param {HTMLDivElement} dropdown
     */
    constructor(input, dropdown) {
        this.input = input
        this.dropdown = dropdown
        this.spinner = this.input.parentNode.querySelector(".spinner-border")

        this.input.addEventListener("focus", () => {
            if(this.dropdown.childElementCount > 0) {
                this.dropdown.classList.add("show")
            }
        })

        this.input.addEventListener("keyup",  async () => {
            if(this.input.value.length >= 2) {
                await this.updateList(this.input.value)
                this.dropdown.classList.add("show")
            }
        })

        this.input.addEventListener("blur", () => {
            setTimeout(() => {
                this.dropdown.classList.remove("show")
            }, 100)
        })
    }


    loading() {
        this.spinner.classList.remove("invisible")
    }

    loaded() {
        this.spinner.classList.add("invisible")
    }


    async updateList(termSearch)
    {
        this.loading()
        let response = await fetch(this.AUTOCOMPLETION_ENDPOINT + termSearch)
        let result = await response.json()
        result = result.slice(0, 4)
        this.dropdown.innerHTML = ""
        this.loaded()

        result.forEach(v => {
            this.dropdown.append(this.suggestionElement(v.label))
        })
    }

    suggestionElement(label)
    {

        let li = document.createElement("li")
        let a = document.createElement("a")
        a.classList.add("dropdown-item")
        a.href = "#"
        a.textContent = label
        li.append(a)

        li.addEventListener("click", (e) => {
            e.preventDefault()
            this.setValue(label)
        })

        return li

    }


    getValue(){
        return this.input.value
    }

    setValue(value) {
        this.input.value = value
    }




}

class FindRelation {

    API_ENDPOINT = "https://timetable.search.ch/api/route.fr.json"
    //API_ENDPOINT = "http://172.20.10.4:8000/api.php" // Fake API for offline testing

    TYPE_ICONS = {
        post: `<img src="../assets/pictos/bus.svg" alt="Type de transport: bus"/>`,
        train: `<img src="../assets/pictos/train.svg"  alt="Type de transport: train"/>`,
        walk: `<img src="../assets/icons/walk.svg"  alt="Type de transport: à pied"/>`,
    }

    params = {
        from: null,
        to: null
    }

    /**
     * @param {HTMLButtonElement} button
     * @param {SearchInput} fromInput
     * @param {SearchInput} toInput
     * @param resultCount
     */
    constructor(button, fromInput, toInput, resultCount) {
        this.fromInput = fromInput
        this.toInput = toInput
        this.resultCount = resultCount
        this.$container = document.querySelector("#accordion")

        button.addEventListener("click", this.handleClick)
    }

    setParams() {
        this.params.from = this.fromInput.getValue()
        this.params.to = this.toInput.getValue()
    }

    handleClick = async (e) => {
        this.$container.innerHTML = ""
        this.$container.append(strToDom(`<div class="spinner-grow spinner-grow" role="status">
  <span class="visually-hidden">Chargement...</span>
</div>`))
        e.preventDefault()
        this.setParams()
        await this.search()
    }


    async search() {
        let response = await fetch(this.API_ENDPOINT + this.queryString())
        let result = await response.json()
        this.useObject(result)
    }

    useObject(json) {

        if(!json.connections){
            let noResult = strToDom(`<div class="accordion-item">
            <h2 class="accordion-header">
              <span class="accordion-button collapsed d-flex align-items-center" type="button">
                Aucun résultat pour votre recherche
              </span>
            </h2>
          </div>`)
            this.$container.innerHTML = ""
            this.$container.append(noResult)
            this.resultCount.textContent = "0"
            return
        }

        this.resultCount.textContent = json.connections.length.toString()

        this.$container.innerHTML = ""
        json.connections.forEach((v, index) => {
            this.getConnection(v, index)
        })

    }

    getConnection(connection, index)
    {
        let departure = new Date(connection.departure.replace(' ', 'T'))
        let arrival = new Date(connection.arrival.replace(' ', 'T'))

        let headingId = `heading-${index}`
        let containerId = `container-${index}`

        let o = strToDom(`<div class="accordion-item">
            <h2 class="accordion-header" id="${headingId}">
              <button class="accordion-button collapsed d-flex align-items-center" type="button" data-bs-target="#${containerId}" data-bs-toggle="collapse" aria-controls="${containerId}">
                <span class="material-icons-round mx-2">train</span>
                ${departure.toLocaleTimeString('fr-CH').substring(0, 5)} - ${arrival.toLocaleTimeString('fr-CH').substring(0, 5)}
              </button>
            </h2>
            <div id="${containerId}" class="accordion-collapse collapse" data-bs-parent="#accordion" aria-labelledby="${headingId}">
              <div class="accordion-body">
                
              </div>
            </div>
          </div>`)

        let accBody = o.querySelector(".accordion-body")
        connection.legs.forEach((leg, index) => {
            if(leg.type !== "walk" && index !== connection.legs.length-1) {
                accBody.append(this.getStep(leg))
            } else if(leg.type === "walk") {
                accBody.append(this.getWalk(leg, connection.legs))
            }
        })

        this.$container.append(o)

    }

    /**
     * @param step
     * @param {Array} legs
     * @return {ChildNode}
     */
    getWalk(step, legs)
    {
        let lastStep = legs[legs.length -1]
        let out = strToDom(`
<div>
    <div class="d-flex align-items-center px-2">
        <span class="material-icons-round me-1" style="color: #5f6166; font-size: 1rem">
            directions_walk
        </span>
        <span style="color: #5f6166; font-size: .7rem" class="me-3">${step.runningtime / 60}"</span>
        <hr class="w-100" style="background-color: #5f6166">
    </div>
</div>
`).nextSibling

        if(step.exit.stopid === lastStep.stopid){
            let exit = this.getStep(lastStep)
            out.appendChild(exit)
        }

        return out
    }

    getStep(step)
    {
        let departure = new Date(step.departure?.replace(' ', 'T') ?? step.arrival?.replace(' ', 'T'))

        let track = "",line = "", exit = null

        if(step.track){
            track = `<span class="text-muted">Voie ${step.track}</span>`
        }
        if(step.line){
            line = `<span class="badge text-light" style="background-color: #${step.bgcolor}">${step.line}</span>`
        }

        if(step.exit) {
            let exitTrack = ""
            if(step.exit.track){
                exitTrack = `<span class="text-muted">Voie ${step.exit.track}</span>`
            }

            let arrival = new Date(step.exit.arrival.replace(' ', 'T'))
            exit = `
<div class="d-flex justify-content-between">
    <h6 class="mb-0"><span class="text-danger font-monospace me-2"><strong>${arrival.toLocaleTimeString().substring(0, 5)}</strong></span> ${step.exit.name}</h6>
    ${exitTrack}
</div>
            `
        }

        return strToDom(`
<div class="p-2 bg-light mb-2">
    <div class="d-flex justify-content-between ${exit ? 'mb-2' : ''}">
        <h6 class="mb-0"><span class="text-danger font-monospace me-2"><strong>${departure.toLocaleTimeString().substring(0, 5)}</strong></span> ${line} ${step.name}</h6>
        ${track}
    </div>
    ${exit ?? ''}
</div>
`).nextSibling
    }

    queryString() {
        return `?from=${this.params.from}&to=${this.params.to}`
    }

}

function strToDom(str) {
    return document.createRange().createContextualFragment(str).firstChild;
}

const $resultCount = document.querySelector("#result-count")
const $fromInput = document.querySelector("#from")
const $toInput = document.querySelector("#to")
const $button = document.querySelector("#search")
const $fromSuggest = document.querySelector("#from-suggest")
const $toSuggest = document.querySelector("#to-suggest")
const $reverseButton = document.querySelector("#reverse")

let from = new SearchInput($fromInput, $fromSuggest)
let to = new SearchInput($toInput, $toSuggest)

$reverseButton.addEventListener("click", e => {
    e.preventDefault()
    let [f, t] = [from.getValue(), to.getValue()]

    from.setValue(t)
    to.setValue(f)
})

new FindRelation($button, from, to, $resultCount)


